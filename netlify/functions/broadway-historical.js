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
    if (parseInt(year) >= 2016 && parseInt(year) <= 2019) {
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
    let showCount = 0;
    
    // Find the week_ending and seats_sold column indices
    const weekEndingIndex = headers.indexOf('week_ending');
    const seatsSoldIndex = headers.indexOf('seats_sold');
    
    // Find data for the matching week number and year
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = line.split(',');
      const lineWeekNumber = values[1]; // week_number column
      const lineWeekEnding = values[weekEndingIndex];
      
      // Check if this row matches our target week and year
      if (lineWeekNumber === week.toString()) {
        // Extract year from date (DD-MM-YY format)
        const dateParts = lineWeekEnding.split('-');
        if (dateParts.length === 3) {
          const rowYear = '20' + dateParts[2];
          if (rowYear === year.toString()) {
            const attendance = parseInt(values[seatsSoldIndex]) || 0;
            if (attendance > 0) {
              totalAttendance += attendance;
              showCount++;
            }
          }
        }
      }
    }

    if (showCount === 0) {
      throw new Error(`No data found for year ${year}, week ${week}`);
    }

    return {
      attendance: totalAttendance,
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
    // Find the specific row for the requested year
    const yearPattern = new RegExp(`<a href="[^"]*year=${year}&week=${week}">${year}</a>`);
    const match = yearPattern.exec(html);
    
    if (!match) {
      throw new Error(`No data found for year ${year}, week ${week}`);
    }
    
    // Find the table row containing this year
    const startIndex = match.index;
    const rowStart = html.lastIndexOf('<TR', startIndex);
    const rowEnd = html.indexOf('</TR>', startIndex) + 5;
    const row = html.substring(rowStart, rowEnd);
    
    // Extract all table cells
    const cellRegex = /<td[^>]*>.*?<\/td>/g;
    const cells = row.match(cellRegex) || [];
    
    if (cells.length < 8) {
      throw new Error(`Invalid table structure for year ${year}, week ${week}`);
    }
    
    // Extract seats sold (index 5) and show count (index 7)
    const seatsSoldCell = cells[5];
    const showCountCell = cells[7];
    
    // Extract numeric values from the cells
    const seatsSoldMatch = seatsSoldCell.match(/>([0-9,]+)</);
    const showCountMatch = showCountCell.match(/>([0-9,]+)</);
    
    if (!seatsSoldMatch || !showCountMatch) {
      throw new Error(`Could not parse attendance or show count for year ${year}, week ${week}`);
    }
    
    const attendance = parseInt(seatsSoldMatch[1].replace(/,/g, '')) || 0;
    const showCount = parseInt(showCountMatch[1].replace(/,/g, '')) || 0;
    
    if (attendance === 0 || showCount === 0) {
      throw new Error(`Invalid data values for year ${year}, week ${week}`);
    }

    return {
      attendance: attendance,
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

