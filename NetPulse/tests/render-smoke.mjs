import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
  const {default:App}=await server.ssrLoadModule('/src/App.jsx');
  const {createElement}=await import('react');
  const html=renderToStaticMarkup(createElement(App));
  for(const text of ['Network overview','API Gateway','Payment API','Notification Worker','Monitored services','Run checks','Demo data']) assert.ok(html.includes(text),`Missing UI: ${text}`);
  assert.equal((html.match(/class="service-link"/g)||[]).length,8);
  assert.ok(!html.includes('Your site is taking shape'));
  console.log('React render smoke check passed: dashboard, 8 service rows, and primary controls.');
} finally {await server.close();}
