exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Log for debugging
    console.log('Event body:', event.body);
    console.log('Environment vars check:', {
      hasToken: !!process.env.AIRTABLE_API_TOKEN,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID,
      hasTableId: !!process.env.AIRTABLE_TABLE_ID
    });

    // Parse the form data
    const data = JSON.parse(event.body);
    console.log('Parsed data:', data);
    
    // Validate required fields
    const requiredFields = ['name', 'work_email', 'org_name', 'city_region'];
    for (const field of requiredFields) {
      if (!data[field] || data[field].trim() === '') {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    // Prepare data for Airtable - only using fields that exist
    const airtableData = {
      "fields": {
        "Contact Name": data.name.trim(),
        "Contact Email": data.work_email.trim(),
        "Name": data.org_name.trim(),
        "City/Region": data.city_region.trim()
      }
    };

    // Submit to Airtable
    const airtableResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableData)
    });

    if (!airtableResponse.ok) {
      const errorData = await airtableResponse.text();
      console.error('Airtable API Error:', errorData);
      console.error('Response status:', airtableResponse.status);
      console.error('Data sent:', JSON.stringify(airtableData, null, 2));
      throw new Error(`Airtable API Error (${airtableResponse.status}): ${errorData}`);
    }

    const result = await airtableResponse.json();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Successfully joined the waitlist!',
        id: result.id 
      })
    };

  } catch (error) {
    console.error('Function Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Something went wrong. Please try again.' 
      })
    };
  }
};