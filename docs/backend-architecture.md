# 🔧 Backend API Documentation

The backend is a lightweight Express server that manages wildcards as files, providing a REST API for the frontend. This enables persistence across sessions and portability of wildcard collections.

## 📝 Table of Contents

- [Architecture Overview](#architecture-overview)
- [API Endpoints](#api-endpoints)
- [File Management](#file-management)
- [Error Handling](#error-handling)
- [Security Considerations](#security-considerations)
- [Deployment Options](#deployment-options)
- [API Reference](#api-reference)

## Architecture Overview

### Technology Stack

- **Express.js**: Minimal web framework
- **Node.js File System**: Direct file operations
- **CORS**: Cross-origin resource sharing
- **ES Modules**: Modern JavaScript imports

### Design Principles

1. **File-Based Storage**: Each wildcard is a `.txt` file
2. **RESTful Design**: Standard HTTP methods
3. **Stateless**: No session management needed
4. **Simple**: No database, minimal dependencies

### Directory Structure

```
backend/
├── server.js           # Main server file
├── package.json        # Dependencies
└── wildcards/          # Auto-created directory
    ├── artists.txt     # Wildcard file
    ├── styles.txt      # Wildcard file
    ├── ...             # More wildcards
    └── _active.json    # Active wildcard tracking
```

## API Endpoints

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "wildcards_dir": "/absolute/path/to/wildcards"
}
```

**Usage:**
```javascript
const healthCheck = await fetch('http://localhost:3001/api/health');
if (healthCheck.ok) {
  console.log('Server is running');
}
```

### Get All Wildcards

```
GET /api/wildcards
```

**Response:**
```json
{
  "wildcards": {
    "artists": "by Van Gogh\nby Picasso\n...",
    "styles": "anime style\ncubist style\n...",
    "moods": "cheerful\nmysterious\n..."
  }
}
```

**Implementation:**
```javascript
app.get('/api/wildcards', async (req, res) => {
  const files = await fs.readdir(WILDCARDS_DIR);
  const wildcards = {};
  
  for (const file of files) {
    if (file.endsWith('.txt')) {
      const name = file.replace('.txt', '');
      const content = await fs.readFile(
        path.join(WILDCARDS_DIR, file), 
        'utf8'
      );
      wildcards[name] = content;
    }
  }
  
  res.json({ wildcards });
});
```

### Get Active Wildcards

```
GET /api/wildcards/active
```

**Response:**
```json
{
  "active": ["artists", "styles", "moods"]
}
```

**Details:**
- Reads from `_active.json` if exists
- Returns all wildcards as active if file missing
- Used to persist UI state

### Update Active Wildcards

```
PUT /api/wildcards/active
```

**Request Body:**
```json
{
  "active": ["artists", "moods"]
}
```

**Response:**
```json
{
  "success": true,
  "active": ["artists", "moods"]
}
```

### Create/Update Wildcard

```
PUT /api/wildcards/:name
```

**Request Body:**
```json
{
  "content": "option 1\noption 2\noption 3"
}
```

**Response:**
```json
{
  "success": true,
  "name": "fantasy_creatures"
}
```

**Implementation Details:**
- Sanitizes filename (lowercase, underscores)
- Overwrites if exists
- Creates new if doesn't exist

### Delete Wildcard

```
DELETE /api/wildcards/:name
```

**Response:**
```json
{
  "success": true
}
```

**Error Response (404):**
```json
{
  "error": "Wildcard not found"
}
```

### Rename Wildcard

```
POST /api/wildcards/:oldName/rename
```

**Request Body:**
```json
{
  "newName": "mythical_beings"
}
```

**Response:**
```json
{
  "success": true,
  "name": "mythical_beings"
}
```

## File Management

### Initialization

```javascript
async function initializeWildcards() {
  try {
    // Create directory if missing
    await fs.mkdir(WILDCARDS_DIR, { recursive: true });
    
    // Check for existing wildcards
    const files = await fs.readdir(WILDCARDS_DIR);
    
    if (files.length === 0) {
      console.log('Creating default wildcards...');
      
      // Create default files
      for (const [name, content] of Object.entries(DEFAULT_WILDCARDS)) {
        const filepath = path.join(WILDCARDS_DIR, `${name}.txt`);
        await fs.writeFile(filepath, content, 'utf8');
      }
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
}
```

### File Operations

#### Reading Files
```javascript
const content = await fs.readFile(filepath, 'utf8');
```

#### Writing Files
```javascript
await fs.writeFile(filepath, content, 'utf8');
```

#### Deleting Files
```javascript
await fs.unlink(filepath);
```

#### Renaming Files
```javascript
await fs.rename(oldPath, newPath);
```

### Filename Sanitization

```javascript
const safeName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
```

**Rules:**
- Lowercase only
- Letters, numbers, underscores
- Spaces become underscores
- Special characters removed

## Error Handling

### Error Response Format

```javascript
{
  "error": "Descriptive error message"
}
```

### Common Error Scenarios

#### File Not Found
```javascript
try {
  await fs.unlink(filepath);
} catch (error) {
  if (error.code === 'ENOENT') {
    res.status(404).json({ error: 'Wildcard not found' });
  }
}
```

#### Invalid Input
```javascript
if (!name || !content) {
  return res.status(400).json({ 
    error: 'Name and content are required' 
  });
}
```

#### Server Errors
```javascript
catch (error) {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error' 
  });
}
```

### Error Logging

```javascript
console.error('Error reading wildcards:', error);
console.error('Error saving wildcard:', error);
console.error('Error deleting wildcard:', error);
```

## Security Considerations

### CORS Configuration

```javascript
app.use(cors());
```

**Production Considerations:**
```javascript
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true
}));
```

### Input Validation

#### Filename Validation
- Sanitize all filenames
- Prevent directory traversal
- Limit filename length

#### Content Validation
- No file size limits implemented
- Consider adding limits for production
- UTF-8 encoding enforced

### Path Security

```javascript
// Always use path.join for file paths
const filepath = path.join(WILDCARDS_DIR, `${safeName}.txt`);

// Never concatenate paths directly
// BAD: WILDCARDS_DIR + '/' + name + '.txt'
```

### Rate Limiting

Not implemented but recommended for production:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
});

app.use('/api/', limiter);
```

## Deployment Options

### Local Development

```bash
# Development with auto-reload
npm run dev

# Production mode
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### Environment Variables

```javascript
const PORT = process.env.PORT || 3001;
const WILDCARDS_DIR = process.env.WILDCARDS_DIR || 
  path.join(__dirname, 'wildcards');
```

### PM2 Production

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'pixellab-wildcards',
    script: './server.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

## API Reference

### Request Headers

All requests should include:
```
Content-Type: application/json
```

### Response Headers

All responses include:
```
Content-Type: application/json
Access-Control-Allow-Origin: *
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 400  | Bad Request (invalid input) |
| 404  | Not Found (wildcard doesn't exist) |
| 500  | Server Error |

### Example Client

```javascript
class WildcardClient {
  constructor(baseURL = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
  }
  
  async getAll() {
    const res = await fetch(`${this.baseURL}/wildcards`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  
  async save(name, content) {
    const res = await fetch(`${this.baseURL}/wildcards/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  
  async delete(name) {
    const res = await fetch(`${this.baseURL}/wildcards/${name}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
```

## Testing

### Manual Testing

```bash
# Test health check
curl http://localhost:3001/api/health

# Get all wildcards
curl http://localhost:3001/api/wildcards

# Create wildcard
curl -X PUT http://localhost:3001/api/wildcards/test \
  -H "Content-Type: application/json" \
  -d '{"content":"option 1\noption 2"}'

# Delete wildcard
curl -X DELETE http://localhost:3001/api/wildcards/test
```

### Automated Testing

```javascript
// test/api.test.js
describe('Wildcard API', () => {
  test('GET /api/wildcards returns object', async () => {
    const res = await fetch('http://localhost:3001/api/wildcards');
    const data = await res.json();
    expect(data).toHaveProperty('wildcards');
    expect(typeof data.wildcards).toBe('object');
  });
});
```

---

This backend provides a simple, file-based storage solution that's perfect for managing wildcards without the complexity of a database. The API is straightforward, the files are portable, and the system is easy to understand and modify.