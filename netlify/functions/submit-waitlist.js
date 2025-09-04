exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the form data
    const data = JSON.parse(event.body);
    
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

    // Prepare data for Airtable
    const airtableData = {
      "fields": {
        "CONTACT NAME": data.name.trim(),
        "CONTACT EMAIL": data.work_email.trim(),
        "NAME": data.org_name.trim(),
        "CITY/REGION": data.city_region.trim(),
        "Submitted At": new Date().toISOString()
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
      throw new Error('Failed to submit to Airtable');
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