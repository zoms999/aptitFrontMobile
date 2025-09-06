// Simple test script to test the login API
async function testLogin() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser',
        password: '111111',
        loginType: 'personal',
        rememberMe: true
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response body:', data);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('Parsed JSON:', jsonData);
    } catch (e) {
      console.log('Failed to parse as JSON');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testLogin();