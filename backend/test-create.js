async function testLiveAPI() {
    try {
        console.log('Logging in...');
        let res = await fetch('https://content-api-vidr.onrender.com/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'author1@example.com', password: 'Password123!' })
        });
        let data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        const token = data.token;
        console.log('Login successful, token received.');

        console.log('Creating post...');
        res = await fetch('https://content-api-vidr.onrender.com/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title: 'My Test Post', content: 'Hello World' })
        });
        data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        console.log('Post created successfully!');
        console.log(JSON.stringify(data, null, 2));

        console.log('Fetching posts list...');
        res = await fetch('https://content-api-vidr.onrender.com/posts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        console.log('Posts fetched successfully!');
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('API Error:');
        console.error(err.message);
    }
}

testLiveAPI();
