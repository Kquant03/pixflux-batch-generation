# 🎲 Wildcard System

The wildcard system is the heart of dynamic prompt generation in PixelLab Batch Generator. It allows you to create reusable collections of options that are randomly selected during generation.

## 📝 Table of Contents

- [Concept](#concept)
- [How It Works](#how-it-works)
- [File Storage](#file-storage)
- [Frontend Implementation](#frontend-implementation)
- [Backend Implementation](#backend-implementation)
- [Default Wildcards](#default-wildcards)
- [Usage Examples](#usage-examples)

## Concept

Wildcards are collections of text options that can be randomly selected when generating images. Think of them as:
- **Dice with many sides** - each generation rolls the dice
- **Dropdown menus** - but the selection is automatic
- **Variable placeholders** - replaced with actual content

### Key Benefits
- **Reusability**: Define once, use everywhere
- **Consistency**: Maintain curated lists of good options
- **Experimentation**: Discover unexpected combinations
- **Organization**: Group related concepts together

## How It Works

### 1. Storage Structure
```
backend/wildcards/
├── artists.txt       # List of artist styles
├── styles.txt        # Art styles
├── moods.txt         # Emotional qualities
├── lighting.txt      # Lighting conditions
├── colors.txt        # Color schemes
├── quality.txt       # Quality descriptors
└── _active.json      # Tracks which wildcards are enabled
```

### 2. Wildcard Format
Each `.txt` file contains options, one per line:
```text
# artists.txt
by Zdislaw Beksinski
by Vincent Van Gogh
by Michelangelo
by Leonardo da Vinci
```

### 3. Usage in Prompts

**Manual Placement**: `__wildcard_name__`
```
A dragon painted __styles__, __artists__
```

**Auto-Append**: Active wildcards automatically append to all prompts
```
Input: "A cute dragon"
Output: "A cute dragon, anime style, by Van Gogh, dramatic lighting"
```

## File Storage

### Backend Structure

```javascript
// server.js - Wildcard file management
const WILDCARDS_DIR = path.join(__dirname, 'wildcards');

// Create wildcard file
app.put('/api/wildcards/:name', async (req, res) => {
  const { name } = req.params;
  const { content } = req.body;
  
  // Sanitize filename
  const safeName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const filepath = path.join(WILDCARDS_DIR, `${safeName}.txt`);
  
  await fs.writeFile(filepath, content, 'utf8');
  res.json({ success: true, name: safeName });
});
```

### Why File Storage?

1. **Persistence**: Survives port changes and server restarts
2. **Portability**: Easy to backup, share, or version control
3. **Direct Editing**: Can edit `.txt` files outside the app
4. **Transparency**: See exactly what's stored

## Frontend Implementation

### State Management

```javascript
// App.jsx - Wildcard state
const [wildcardFiles, setWildcardFiles] = useState({});
const [activeWildcards, setActiveWildcards] = useState([]);
const [serverConnected, setServerConnected] = useState(false);

// API communication layer
const wildcardAPI = {
  async getAll() {
    const response = await fetch(`${API_URL}/wildcards`);
    const data = await response.json();
    return data.wildcards;
  },
  
  async save(name, content) {
    const response = await fetch(`${API_URL}/wildcards/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    return await response.json();
  }
};
```

### Dynamic Prompt Processing

```javascript
const processDynamicPrompt = (prompt) => {
  let processedPrompt = prompt;
  const selections = [];
  
  // Process manual wildcard placements: __wildcardname__
  const wildcardRegex = /__([^_]+)__/g;
  processedPrompt = processedPrompt.replace(wildcardRegex, (match, wildcardName) => {
    const selected = processWildcard(match, wildcardName);
    if (selected !== match) {
      selections.push({
        type: 'wildcard',
        original: match,
        selected: selected,
        wildcardName: wildcardName,
        placement: 'manual'
      });
    }
    return selected;
  });
  
  // Auto-append active wildcards
  const shuffledActiveWildcards = [...activeWildcards].sort(() => Math.random() - 0.5);
  // ... append logic
  
  return { processedPrompt, selections };
};
```

### UI Components

```javascript
// Wildcard manager section
<div className="space-y-2 max-h-64 overflow-y-auto pr-2">
  {Object.entries(wildcardFiles).map(([name, content]) => {
    const lines = content.split('\n').filter(l => l.trim());
    const isActive = activeWildcards.includes(name);
    
    return (
      <div key={name} className={`p-3 bg-gray-700 rounded-lg border-2 ${
        isActive ? 'border-purple-500' : 'border-gray-600'
      }`}>
        {/* Checkbox for activation */}
        <input
          type="checkbox"
          checked={isActive}
          onChange={() => toggleWildcard(name)}
        />
        
        {/* Click to add placeholder */}
        <button onClick={() => addWildcardPlaceholder(name)}>
          __{name}__
        </button>
        
        {/* Edit and delete buttons */}
      </div>
    );
  })}
</div>
```

## Backend Implementation

### API Endpoints

```javascript
// Get all wildcards
app.get('/api/wildcards', async (req, res) => {
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
});

// Update active wildcards
app.put('/api/wildcards/active', async (req, res) => {
  const { active } = req.body;
  const activeFile = path.join(WILDCARDS_DIR, '_active.json');
  
  await fs.writeFile(activeFile, JSON.stringify(active, null, 2), 'utf8');
  res.json({ success: true, active });
});
```

### File Management

```javascript
// Initialize default wildcards
async function initializeWildcards() {
  await fs.mkdir(WILDCARDS_DIR, { recursive: true });
  
  const files = await fs.readdir(WILDCARDS_DIR);
  
  if (files.length === 0) {
    // Create default wildcard files
    for (const [name, content] of Object.entries(DEFAULT_WILDCARDS)) {
      const filepath = path.join(WILDCARDS_DIR, `${name}.txt`);
      await fs.writeFile(filepath, content, 'utf8');
    }
  }
}
```

## Default Wildcards

The system comes with 6 pre-configured wildcards:

### artists (20 options)
Artist styles from classical to contemporary

### styles (20 options)
Art movements and visual styles

### moods (20 options)
Emotional qualities and atmospheres

### lighting (20 options)
Lighting conditions and effects

### colors (20 options)
Color schemes and palettes

### quality (20 options)
Quality and detail descriptors

## Usage Examples

### Example 1: Character Generation
```
Wildcard: fantasy_races
Content:
  elf with pointed ears
  dwarf with braided beard
  orc with tusks
  halfling with curly hair

Prompt: A __fantasy_races__ warrior
Results: "A dwarf with braided beard warrior"
```

### Example 2: Environment Variety
```
Active wildcards: lighting, moods, colors
Prompt: "A forest path"
Result: "A forest path, golden hour, mysterious, earth tones"
```

### Example 3: Style Exploration
```
Manual placement: "Draw a cat __styles__, __artists__"
Result: "Draw a cat impressionist style, by Claude Monet"
```

## Best Practices

1. **Naming Conventions**
   - Use lowercase with underscores
   - Be descriptive: `fantasy_creatures` not `fc`
   - Group related concepts

2. **Content Organization**
   - One option per line
   - Keep options concise
   - Test each option individually

3. **Activation Strategy**
   - Activate complementary wildcards together
   - Disable conflicting wildcards
   - Use manual placement for specific needs

4. **Maintenance**
   - Regularly review and update options
   - Remove options that don't work well
   - Back up your wildcards folder

---

Next: [Dynamic Prompting](./dynamic-prompting.md) - Learn about variation syntax