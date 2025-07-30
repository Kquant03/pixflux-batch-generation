// server.js - Simple Express backend for wildcard management
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Wildcards directory
const WILDCARDS_DIR = path.join(__dirname, 'wildcards');

// Default wildcards to create if none exist
const DEFAULT_WILDCARDS = {
  'artists': `by Zdislaw Beksinski
by Vincent Van Gogh
by Michelangelo
by Leonardo da Vinci
by Pablo Picasso
by Claude Monet
by Salvador Dali
by Andy Warhol
by Banksy
by Yayoi Kusama
by Frida Kahlo
by Gustav Klimt
by Edvard Munch
by Jackson Pollock
by Georgia O'Keeffe
by Jean-Michel Basquiat
by Keith Haring
by David Hockney
by Katsushika Hokusai
by Takashi Murakami`,
    
  'styles': `anime style
surrealist style
expressionist style
impressionist style
cubist style
art deco style
art nouveau style
baroque style
minimalist style
maximalist style
gothic style
romantic style
realistic style
abstract style
pop art style
street art style
digital art style
watercolor style
oil painting style
pencil sketch style`,
    
  'moods': `cheerful
melancholic
mysterious
energetic
peaceful
dramatic
whimsical
tense
romantic
nostalgic
ethereal
dark
bright
serene
chaotic
dreamy
aggressive
tranquil
euphoric
contemplative`,
    
  'lighting': `soft lighting
dramatic lighting
rim lighting
backlit
golden hour
blue hour
neon lights
candlelight
moonlight
sunlight
studio lighting
natural lighting
harsh shadows
diffused light
volumetric lighting
bioluminescent
glowing
radiant
dim lighting
bright lighting`,
    
  'colors': `vibrant colors
muted colors
pastel colors
neon colors
monochrome
sepia tones
warm colors
cool colors
complementary colors
analogous colors
triadic colors
earth tones
jewel tones
metallic colors
rainbow colors
gradient colors
duo-tone
psychedelic colors
natural colors
artificial colors`,
    
  'quality': `masterpiece
high quality
ultra detailed
professional
award winning
stunning
beautiful
intricate
elaborate
refined
polished
crisp
sharp
clean
pristine
flawless
perfect
exceptional
outstanding
remarkable`
};

// Initialize wildcards directory and default files
async function initializeWildcards() {
  try {
    // Create directory if it doesn't exist
    await fs.mkdir(WILDCARDS_DIR, { recursive: true });
    console.log(`Wildcards directory: ${WILDCARDS_DIR}`);
    
    // Check for existing wildcards
    const files = await fs.readdir(WILDCARDS_DIR);
    
    if (files.length === 0) {
      console.log('No wildcards found, creating defaults...');
      
      // Create default wildcard files
      for (const [name, content] of Object.entries(DEFAULT_WILDCARDS)) {
        const filepath = path.join(WILDCARDS_DIR, `${name}.txt`);
        await fs.writeFile(filepath, content, 'utf8');
        console.log(`Created default wildcard: ${name}.txt`);
      }
    } else {
      console.log(`Found ${files.length} existing wildcards`);
    }
  } catch (error) {
    console.error('Error initializing wildcards:', error);
  }
}

// API Routes

// Get all wildcards
app.get('/api/wildcards', async (req, res) => {
  try {
    const files = await fs.readdir(WILDCARDS_DIR);
    const wildcards = {};
    
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const name = file.replace('.txt', '');
        const content = await fs.readFile(path.join(WILDCARDS_DIR, file), 'utf8');
        wildcards[name] = content;
      }
    }
    
    res.json({ wildcards });
  } catch (error) {
    console.error('Error reading wildcards:', error);
    res.status(500).json({ error: 'Failed to read wildcards' });
  }
});

// Get active wildcards (stored in a separate file)
app.get('/api/wildcards/active', async (req, res) => {
  try {
    const activeFile = path.join(WILDCARDS_DIR, '_active.json');
    
    try {
      const data = await fs.readFile(activeFile, 'utf8');
      const active = JSON.parse(data);
      res.json({ active });
    } catch {
      // If file doesn't exist, return all wildcards as active
      const files = await fs.readdir(WILDCARDS_DIR);
      const active = files
        .filter(f => f.endsWith('.txt'))
        .map(f => f.replace('.txt', ''));
      res.json({ active });
    }
  } catch (error) {
    console.error('Error reading active wildcards:', error);
    res.status(500).json({ error: 'Failed to read active wildcards' });
  }
});

// Update active wildcards
app.put('/api/wildcards/active', async (req, res) => {
  try {
    const { active } = req.body;
    const activeFile = path.join(WILDCARDS_DIR, '_active.json');
    
    await fs.writeFile(activeFile, JSON.stringify(active, null, 2), 'utf8');
    res.json({ success: true, active });
  } catch (error) {
    console.error('Error updating active wildcards:', error);
    res.status(500).json({ error: 'Failed to update active wildcards' });
  }
});

// Create or update a wildcard
app.put('/api/wildcards/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { content } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }
    
    // Sanitize filename
    const safeName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const filepath = path.join(WILDCARDS_DIR, `${safeName}.txt`);
    
    await fs.writeFile(filepath, content, 'utf8');
    res.json({ success: true, name: safeName });
  } catch (error) {
    console.error('Error saving wildcard:', error);
    res.status(500).json({ error: 'Failed to save wildcard' });
  }
});

// Delete a wildcard
app.delete('/api/wildcards/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const filepath = path.join(WILDCARDS_DIR, `${name}.txt`);
    
    await fs.unlink(filepath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting wildcard:', error);
    res.status(500).json({ error: 'Failed to delete wildcard' });
  }
});

// Rename a wildcard
app.post('/api/wildcards/:oldName/rename', async (req, res) => {
  try {
    const { oldName } = req.params;
    const { newName } = req.body;
    
    if (!newName) {
      return res.status(400).json({ error: 'New name is required' });
    }
    
    const safeName = newName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const oldPath = path.join(WILDCARDS_DIR, `${oldName}.txt`);
    const newPath = path.join(WILDCARDS_DIR, `${safeName}.txt`);
    
    await fs.rename(oldPath, newPath);
    res.json({ success: true, name: safeName });
  } catch (error) {
    console.error('Error renaming wildcard:', error);
    res.status(500).json({ error: 'Failed to rename wildcard' });
  }
});

// Export all wildcards as ZIP
app.get('/api/wildcards/export', async (req, res) => {
  try {
    const files = await fs.readdir(WILDCARDS_DIR);
    const wildcards = {};
    
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const name = file.replace('.txt', '');
        const content = await fs.readFile(path.join(WILDCARDS_DIR, file), 'utf8');
        wildcards[name] = content;
      }
    }
    
    res.json({ wildcards, count: Object.keys(wildcards).length });
  } catch (error) {
    console.error('Error exporting wildcards:', error);
    res.status(500).json({ error: 'Failed to export wildcards' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', wildcards_dir: WILDCARDS_DIR });
});

// Start server
async function start() {
  await initializeWildcards();
  
  app.listen(PORT, () => {
    console.log(`Wildcard server running on http://localhost:${PORT}`);
    console.log(`Wildcards stored in: ${WILDCARDS_DIR}`);
  });
}

start();