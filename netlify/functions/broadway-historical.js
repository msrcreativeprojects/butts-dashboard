const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Get parameters
    const year = event.queryStringParameters?.year || '2024';
    const week = event.queryStringParameters?.week || '35';

    console.log('Historical function called with year:', year, 'week:', week);

    let historicalData;

    // Check if we have data in our GitHub dataset (2016-2019)
    if (year >= 2016 && year <= 2019) {
      historicalData = await getDataFromGitHubDataset(year, week);
    } else {
      // Use BroadwayWorld scraping for other years (1996-2015, 2020-2024)
      historicalData = await getDataFromBroadwayWorld(year, week);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(historicalData),
    };

  } catch (error) {
    console.error('Error in historical function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch historical data',
        details: error.message
      }),
    };
  }
};

async function getDataFromGitHubDataset(year, week) {
  try {
    // Read the CSV file
    const csvPath = path.join(__dirname, '../../historical_weekly_data.csv');
    const csvData = fs.readFileSync(csvPath, 'utf8');
    
    // Parse CSV and find matching week
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    let totalAttendance = 0;
    let totalCapacity = 0;
    let showCount = 0;
    
    // Find the week_ending column index
    const weekEndingIndex = headers.indexOf('week_ending');
    const seatsSoldIndex = headers.indexOf('seats_sold');
    const seatsInTheatreIndex = headers.indexOf('seats_in_theatre');
    
    // Convert week number to date format (DD-MM-YY)
    const weekEndingDate = getWeekEndingDate(year, week);
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = line.split(',');
      const lineWeekEnding = values[weekEndingIndex];
      
      if (lineWeekEnding === weekEndingDate) {
        const attendance = parseInt(values[seatsSoldIndex]) || 0;
        const capacity = parseInt(values[seatsInTheatreIndex]) || 0;
        
        if (attendance > 0 && capacity > 0) {
          totalAttendance += attendance;
          totalCapacity += capacity;
          showCount++;
        }
      }
    }
    
    if (showCount === 0) {
      throw new Error(`No data found for year ${year}, week ${week}`);
    }
    
    const fillPercentage = Math.round((totalAttendance / totalCapacity) * 100);
    
    return {
      attendance: totalAttendance,
      capacity: totalCapacity,
      percentage: fillPercentage,
      year: year,
      week: week,
      context: `Real weekly data from GitHub dataset (${year}, week ${week})`,
      dataQuality: 'real',
      showCount: showCount,
      source: 'GitHub Dataset'
    };
    
  } catch (error) {
    console.error('Error reading GitHub dataset:', error);
    throw error;
  }
}

async function getDataFromBroadwayWorld(year, week) {
  try {
    // Fetch real historical data from BroadwayWorld
    const response = await fetch(`https://www.broadwayworld.com/grossesbyweek.cfm?year=${year}&week=${week}`);
    const html = await response.text();

    // Parse the historical data from the HTML
    const historicalData = parseBroadwayWorldData(html, year, week);

    return historicalData;

  } catch (error) {
    console.error('Error fetching from BroadwayWorld:', error);
    throw error;
  }
}

function parseBroadwayWorldData(html, year, week) {
  try {
    let totalAttendance = 0;
    let totalCapacity = 0;
    let showCount = 0;

    // Parse the BroadwayWorld weekly grosses table
    const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gs;
    const rows = html.match(tableRowRegex) || [];
    
    // BroadwayWorld shows data in table rows with specific patterns
    for (const row of rows) {
      // Look for attendance/capacity patterns
      const numberMatches = row.match(/(\d{1,3}(?:,\d{3})*)/g);
      
      if (numberMatches && numberMatches.length >= 8) {
        try {
          const attendance = parseInt(numberMatches[4]?.replace(/,/g, '')) || 0;
          const capacity = parseInt(numberMatches[5]?.replace(/,/g, '')) || 0;
          
          if (attendance > 0 && capacity > 0 && attendance <= capacity) {
            totalAttendance += attendance;
            totalCapacity += capacity;
            showCount++;
          }
        } catch (e) {
          continue;
        }
      }
    }

    if (showCount === 0) {
      throw new Error(`No valid data found for year ${year}, week ${week}`);
    }

    const fillPercentage = Math.round((totalAttendance / totalCapacity) * 100);

    return {
      attendance: totalAttendance,
      capacity: totalCapacity,
      percentage: fillPercentage,
      year: year,
      week: week,
      context: `Real weekly data from BroadwayWorld (${year}, week ${week})`,
      dataQuality: 'real',
      showCount: showCount,
      source: 'BroadwayWorld'
    };

  } catch (error) {
    console.error('Error parsing BroadwayWorld data:', error);
    throw error;
  }
}

function getWeekEndingDate(year, week) {
  // Convert year and week to a date format that matches the CSV
  // This is a simplified conversion - you might need to adjust based on the actual CSV format
  const startOfYear = new Date(year, 0, 1);
  const weekEnding = new Date(startOfYear.getTime() + (week * 7 - 1) * 24 * 60 * 60 * 1000);
  
  // Format as DD-MM-YY
  const day = String(weekEnding.getDate()).padStart(2, '0');
  const month = String(weekEnding.getMonth() + 1).padStart(2, '0');
  const shortYear = String(year).slice(-2);
  
  return `${day}-${month}-${shortYear}`;
}
