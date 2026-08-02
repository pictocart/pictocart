import { hash } from 'bcrypt';

async function run() {
  try {
    const hashed = await hash('password123', 10);
    console.log("Generated hash:", hashed);
  } catch (err) {
    console.error("Error using bcrypt:", err.message);
  }
}

run();
