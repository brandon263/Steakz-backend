import axios from 'axios';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTEsInJvbGUiOiJDQVNISUVSIiwiYnJhbmNoSWQiOjMsImlhdCI6MTc4MDkxNzcxOSwiZXhwIjoxNzgxNTIyNTE5fQ.ZIiePC7ETB1i3Ewl3mFla_S-XqiRNycBOU0yoN4T4Dc';

async function main() {
  try {
    const res = await axios.get('http://localhost:3001/api/cashier/menu', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('status', res.status);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    if (err.response) {
      console.error('status', err.response.status);
      console.error('data', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('error', err.message);
    }
  }
}

main();
