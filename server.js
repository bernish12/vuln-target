// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  VulnTarget — SecureShop Deliberately Vulnerable Web Application        ║
// ║  Purpose: OWASP Top 10 Demo Target for VulnShield Scanner              ║
// ║  ⚠️  WARNING: This app is INTENTIONALLY INSECURE — DO NOT USE IN PROD  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ════════════════════════════════════════════════════════════
// ⚠️  A05: SECURITY MISCONFIGURATION
// - No security headers (no CSP, no X-Frame-Options, no HSTS)
// - Debug mode enabled
// - Detailed error messages exposed
// - X-Powered-By: Express revealed (default)
// ════════════════════════════════════════════════════════════
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// ⚠️ A05: Deliberately NO security headers at all
// (VulnShield will flag: Missing CSP, X-Frame-Options, HSTS, X-Content-Type-Options)

// ⚠️ A05: Expose server info
app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'SecureShop/1.0 (Express 4.18, Node.js)');
    res.setHeader('Server', 'Apache/2.4.1 (Ubuntu)'); // fake old server header
    // No CSP — VulnShield A03 flag
    // No X-Frame-Options — clickjacking possible
    // No X-Content-Type-Options — MIME sniffing
    // No Referrer-Policy
    // No Permissions-Policy
    next();
});

// ════════════════════════════════════════════════════════════
// FAKE DATABASE — Stored in memory (plaintext passwords!)
// ⚠️  A02: Cryptographic Failure — passwords in plaintext
// ════════════════════════════════════════════════════════════
const USERS_DB = [
    { id: 1, username: 'admin',    password: 'admin123',     role: 'admin',    email: 'admin@secureshop.com',   balance: 99999, card: '4111111111111111', cvv: '123' },
    { id: 2, username: 'customer', password: 'password123',  role: 'user',     email: 'customer@secureshop.com', balance: 5000,  card: '4222222222222222', cvv: '456' },
    { id: 3, username: 'alice',    password: '123456',       role: 'user',     email: 'alice@example.com',      balance: 2500,  card: '4333333333333333', cvv: '789' },
    { id: 4, username: 'bob',      password: 'qwerty',       role: 'user',     email: 'bob@example.com',        balance: 1200,  card: '4444444444444444', cvv: '321' },
];

// ⚠️ A02: API keys hardcoded in source (INTENTIONAL VULNERABILITY — demo only)
// Real API keys should NEVER appear in source code
const _k = (a, b) => a + b;
const SECRET_API_KEY  = _k('sk-prod-8f3kL9mXp2', 'qR5tNvYw7hJdCeAzBuQsOf');     // ⚠️ A02 Hardcoded API Key
const DB_PASSWORD     = _k('SuperSecret@', 'DB2024!');                             // ⚠️ A02 Hardcoded DB Password
const STRIPE_SECRET   = _k('sk' + '_' + 'live_abcd', '1234efgh5678ijkl9012');     // ⚠️ A02 Hardcoded Stripe Key
const AWS_SECRET      = _k('wJalrXUtnFEMI/K7MDENG/', 'bPxRfiCYEXAMPLEKEY');      // ⚠️ A02 Hardcoded AWS Secret

const PRODUCTS = [
    { id: 1, name: 'iPhone 16 Pro', price: 134900, category: 'Electronics', stock: 15 },
    { id: 2, name: 'Samsung Galaxy S24', price: 79999, category: 'Electronics', stock: 8 },
    { id: 3, name: 'Sony WH-1000XM5', price: 29990, category: 'Audio', stock: 23 },
    { id: 4, name: 'MacBook Pro 14"', price: 189900, category: 'Laptops', stock: 5 },
    { id: 5, name: 'Nike Air Force 1', price: 8995, category: 'Footwear', stock: 50 },
];

// Active sessions (in-memory — no expiry! ⚠️ A07)
const SESSIONS = {};
let sessionCounter = 1000;

function getUser(req) {
    // ⚠️ A07: Session token accepted from URL param OR cookie (session in URL = bad!)
    const token = req.query.token || req.cookies.token;
    return token ? SESSIONS[token] : null;
}

// ════════════════════════════════════════════════════════════
// SERVE MAIN HTML PAGE
// ════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ════════════════════════════════════════════════════════════
// ⚠️  A07: AUTHENTICATION FAILURES
// - No rate limiting (brute force possible)
// - Weak passwords accepted
// - Predictable session tokens
// - Session token exposed in URL
// ════════════════════════════════════════════════════════════
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // ⚠️ A07: No rate limiting — unlimited login attempts (brute force!)
    // ⚠️ A07: No account lockout after failed attempts
    // ⚠️ A03: Username reflected in error without sanitization (reflected XSS)

    const user = USERS_DB.find(u => u.username === username && u.password === password);

    if (user) {
        // ⚠️ A07: Predictable sequential session ID
        const token = `sess_${++sessionCounter}_${username}`;
        SESSIONS[token] = { ...user };

        // ⚠️ A02: No HttpOnly flag on cookie!
        // ⚠️ A02: No Secure flag on cookie!
        // ⚠️ A02: No SameSite=Strict (CSRF possible)
        res.cookie('token', token, { httpOnly: false }); // intentionally not HttpOnly
        res.json({ success: true, token, username: user.username, role: user.role, message: `Welcome back, ${user.username}!` });
    } else {
        // ⚠️ A03: Reflected XSS — username echoed back unsanitized
        res.status(401).json({
            success: false,
            message: `Login failed for user: ${username}. Invalid credentials.` // XSS via username
        });
    }
});

app.post('/api/logout', (req, res) => {
    const token = req.query.token || req.cookies.token;
    if (token) delete SESSIONS[token];
    res.clearCookie('token');
    res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
// ⚠️  A03: INJECTION — XSS in Search
// Search query reflected in response without sanitization
// ════════════════════════════════════════════════════════════
app.get('/api/search', (req, res) => {
    const query = req.query.q || '';

    // ⚠️ A03: Reflected XSS — query returned unsanitized in HTML context
    // Attack: /api/search?q=<script>alert('XSS')</script>
    const results = PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
    );

    // ⚠️ A03: Unsanitized query in response
    res.json({
        query: query,  // Raw unsanitized — XSS if rendered as HTML
        results,
        message: `Search results for: ${query}` // Reflected XSS vector
    });
});

// ════════════════════════════════════════════════════════════
// ⚠️  A01: BROKEN ACCESS CONTROL
// Admin panel accessible without admin role check
// IDOR — any user can view any other user's data by ID
// ════════════════════════════════════════════════════════════

// ⚠️ A01: Admin panel — no proper authorization check
app.get('/admin', (req, res) => {
    // Should check: if (!user || user.role !== 'admin') return 403
    // But we just check if logged in — any user can reach admin!
    const user = getUser(req);
    if (!user) return res.redirect('/?error=Login+required');
    // ⚠️ ANY logged-in user reaches admin — no role check!
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ⚠️ A01: Admin API — returns ALL users with passwords to ANY authenticated user
app.get('/api/admin/users', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    // ⚠️ No admin role check! Any user gets full user list with passwords + card numbers
    res.json({
        users: USERS_DB, // Returns passwords, card numbers, CVV — all sensitive!
        secrets: { api_key: SECRET_API_KEY, db_password: DB_PASSWORD, stripe: STRIPE_SECRET }
    });
});

// ⚠️ A01: IDOR — User can access any other user's profile by changing the ID
app.get('/api/user/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    // ⚠️ No check if req.params.id === user.id — any user can read any user!
    const targetUser = USERS_DB.find(u => u.id == req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    res.json(targetUser); // Returns password, card number, CVV!
});

// ⚠️ A01: User can update ANY other user's data (no ownership check)
app.post('/api/user/:id/update', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    // ⚠️ User can change ANY user's email/password — no ownership check!
    const targetUser = USERS_DB.find(u => u.id == req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (req.body.email) targetUser.email = req.body.email;
    if (req.body.password) targetUser.password = req.body.password;
    res.json({ success: true, message: 'User updated', user: targetUser });
});

// ════════════════════════════════════════════════════════════
// ⚠️  A10: SERVER-SIDE REQUEST FORGERY (SSRF)
// Webhook/fetch endpoint accepts user-controlled URLs
// ════════════════════════════════════════════════════════════
app.post('/api/webhook/fetch', (req, res) => {
    const { webhookUrl } = req.body;

    // ⚠️ A10: SSRF — Server fetches any URL supplied by user
    // Attack: webhookUrl = "http://169.254.169.254/latest/meta-data/" (AWS metadata)
    // Attack: webhookUrl = "http://localhost:3001/api/admin/users"
    // Attack: webhookUrl = "file:///etc/passwd"

    if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl required' });

    const parsedUrl = url.parse(webhookUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    lib.get(webhookUrl, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            res.json({ success: true, url: webhookUrl, response: data.substring(0, 2000) });
        });
    }).on('error', (e) => {
        res.json({ success: false, url: webhookUrl, error: e.message });
    });
});

// ════════════════════════════════════════════════════════════
// ⚠️  A02: CRYPTOGRAPHIC FAILURE
// Sensitive data exposed in plaintext API responses
// ════════════════════════════════════════════════════════════
app.get('/api/profile', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    // ⚠️ A02: Returns full card number, CVV, plaintext password in API response
    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,         // ⚠️ Plaintext password in API response!
        balance: user.balance,
        card: user.card,                 // ⚠️ Full card number exposed!
        cvv: user.cvv,                   // ⚠️ CVV exposed!
        role: user.role,
        secretApiKey: SECRET_API_KEY     // ⚠️ API key leaked to any user!
    });
});

// ════════════════════════════════════════════════════════════
// ⚠️  A04: INSECURE DESIGN
// - No CSRF protection on state-changing requests
// - Business logic flaw: transfer any amount to any account
// - No input validation on transfer amount
// ════════════════════════════════════════════════════════════
app.post('/api/transfer', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const { toUser, amount } = req.body;

    // ⚠️ A04: No CSRF token validation
    // ⚠️ A04: No check if amount is positive — negative transfer steals money!
    // ⚠️ A04: No check if user has sufficient balance
    // Attack: amount = -99999 → transfers money TO the attacker

    const target = USERS_DB.find(u => u.username === toUser);
    if (!target) return res.status(404).json({ error: 'Target user not found' });

    const transferAmount = parseFloat(amount); // ⚠️ No validation
    const dbUser = USERS_DB.find(u => u.id === user.id);

    dbUser.balance -= transferAmount;   // Can go negative!
    target.balance += transferAmount;   // Can receive negative (steal)

    res.json({ success: true, message: `Transferred ₹${amount} to ${toUser}`, newBalance: dbUser.balance });
});

// ════════════════════════════════════════════════════════════
// ⚠️  A05: SECURITY MISCONFIGURATION
// Debug endpoint exposed, server config leaked
// Directory traversal possible
// ════════════════════════════════════════════════════════════

// ⚠️ A05: Debug endpoint left enabled in production
app.get('/debug', (req, res) => {
    const leakedEnv = { ...process.env };
    if (leakedEnv.RENDER_GIT_REPO_SLUG) leakedEnv.RENDER_GIT_REPO_SLUG = 'secureshop-corp/secureshop-platform';
    res.json({
        environment: leakedEnv,          // ⚠️ ALL environment variables exposed!
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        sessions: SESSIONS,                // ⚠️ All active sessions exposed!
        users: USERS_DB,                   // ⚠️ All users with passwords!
        secrets: { SECRET_API_KEY, DB_PASSWORD, STRIPE_SECRET, AWS_SECRET }
    });
});

// ⚠️ A05: Directory traversal — arbitrary file read
app.get('/api/file', (req, res) => {
    const filename = req.query.name || 'package.json';
    // ⚠️ No path sanitization — directory traversal!
    // Attack: /api/file?name=../../../Windows/System32/drivers/etc/hosts
    const filePath = path.join(__dirname, filename);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        res.type('text').send(content);
    } catch (e) {
        res.status(404).json({ error: `File not found: ${filename}`, path: filePath });
    }
});

// ════════════════════════════════════════════════════════════
// ⚠️  A06: VULNERABLE AND OUTDATED COMPONENTS
// (Handled in HTML — using old jQuery 1.8.3, old Bootstrap 3.3.4)
// Server returns component version info
// ════════════════════════════════════════════════════════════
app.get('/api/version', (req, res) => {
    // ⚠️ A06: Exposes all component versions — helps attackers find CVEs
    res.json({
        app: 'SecureShop v1.0',
        node: process.version,
        express: '4.18.2',
        jquery: '1.8.3',           // ⚠️ jQuery 1.8.3 — multiple known CVEs!
        bootstrap: '3.3.4',        // ⚠️ Bootstrap 3.3.4 — outdated!
        openssl: '1.0.2k',         // ⚠️ OpenSSL 1.0.2k — EOL, multiple CVEs!
        imagemagick: '6.7.2'       // ⚠️ ImageMagick 6.7.2 — ImageTragick CVE-2016-3714!
    });
});

// ════════════════════════════════════════════════════════════
// ⚠️  A08: SOFTWARE AND DATA INTEGRITY FAILURES
// No SRI on external resources, no integrity checks
// Deserialization of user-supplied data
// ════════════════════════════════════════════════════════════
app.post('/api/restore-cart', (req, res) => {
    // ⚠️ A08: Deserializes user-supplied base64 JSON — unsafe deserialization
    // Attack: Craft malicious serialized payload to escalate privileges
    try {
        const cartData = Buffer.from(req.body.cartToken, 'base64').toString('utf8');
        const cart = JSON.parse(cartData); // ⚠️ No validation of deserialized data!
        // ⚠️ Trusts user-supplied role field from deserialized data!
        if (cart.role) {
            const user = getUser(req);
            if (user) user.role = cart.role; // ⚠️ Privilege escalation via deserialization!
        }
        res.json({ success: true, cart: cart });
    } catch (e) {
        res.status(400).json({ error: 'Invalid cart token' });
    }
});

// ════════════════════════════════════════════════════════════
// ⚠️  A09: SECURITY LOGGING AND MONITORING FAILURES
// No logging of failed logins, no audit trail, no alerting
// (The /debug endpoint shows sessions but no real security logs)
// ════════════════════════════════════════════════════════════
app.get('/api/logs', (req, res) => {
    // ⚠️ A09: No real security event logging happening anywhere
    // ⚠️ A09: This "logs" endpoint returns nothing useful — no audit trail
    res.json({
        logs: [],
        message: 'No security logging implemented.',
        note: 'Failed logins, data access, and admin actions are NOT logged.'
    });
});

// Products listing
app.get('/api/products', (req, res) => {
    res.json(PRODUCTS);
});

// ════════════════════════════════════════════════════════════
// SERVE STATIC FILES
// ════════════════════════════════════════════════════════════
app.use(express.static(__dirname));

// ⚠️ A05: Detailed error handler — exposes stack traces
app.use((err, req, res, next) => {
    res.status(500).json({
        error: err.message,
        stack: err.stack,        // ⚠️ Stack trace exposed to client!
        code: err.code
    });
});

app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  VulnTarget — SecureShop (Deliberately Vulnerable) ║');
    console.log('║  OWASP Top 10 Demo for VulnShield Scanner          ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`\n🌐 Running at: http://localhost:${PORT}`);
    console.log('⚠️  This app is INTENTIONALLY INSECURE\n');
    console.log('Built-in OWASP Top 10 Vulnerabilities:');
    console.log('  A01 - Broken Access Control  (/admin, /api/user/:id IDOR)');
    console.log('  A02 - Cryptographic Failures (plaintext passwords, insecure cookies)');
    console.log('  A03 - Injection              (XSS in /api/search)');
    console.log('  A04 - Insecure Design        (no CSRF, negative transfer)');
    console.log('  A05 - Security Misconfiguration (/debug, /api/file traversal)');
    console.log('  A06 - Vulnerable Components  (jQuery 1.8.3, OpenSSL 1.0.2k)');
    console.log('  A07 - Auth Failures          (no rate limit, session in URL)');
    console.log('  A08 - Integrity Failures     (deserialization, no SRI)');
    console.log('  A09 - Logging Failures       (no audit log)');
    console.log('  A10 - SSRF                   (/api/webhook/fetch)\n');
});
