import 'dotenv/config';

const required = {
  BASE_RPC_URL: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
};

const optional = {
  BIRD_AUTH_TOKEN: process.env.BIRD_AUTH_TOKEN || '',
  BIRD_CT0: process.env.BIRD_CT0 || '',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '',
};

// Validate required vars
for (const [key, val] of Object.entries(required)) {
  if (!val) throw new Error(`Missing required env var: ${key}`);
}

export const config = { ...required, ...optional };
