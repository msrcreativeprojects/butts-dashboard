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

    // Simple historical data lookup
    const historicalData = {
      '2024': { attendance: 210000, capacity: 255000 },
      '2023': { attendance: 195000, capacity: 248000 },
      '2022': { attendance: 165000, capacity: 235000 },
      '2021': { attendance: 85000, capacity: 180000 },
      '2020': { attendance: 45000, capacity: 200000 },
      '2019': { attendance: 225000, capacity: 265000 },
      '2018': { attendance: 220000, capacity: 260000 },
      '2017': { attendance: 215000, capacity: 255000 },
      '2016': { attendance: 210000, capacity: 250000 },
      '2015': { attendance: 205000, capacity: 245000 }
    };

    const data = historicalData[year] || { attendance: 200000, capacity: 250000 };

    const result = {
      attendance: data.attendance,
      capacity: data.capacity,
      percentage: Math.round((data.attendance / data.capacity) * 100),
      year: year,
      week: week,
      context: `Historical data for ${year}`,
      dataQuality: 'historical'
    };

    console.log('Returning data:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
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
