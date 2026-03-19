import { app } from './app.js';
import { config } from './config.js';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});