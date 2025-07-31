# 🏗️ Frontend Architecture

The frontend is built with React and Vite, using modern hooks and component patterns. This document explains the architecture, state management, and key components.

## 📝 Table of Contents

- [Technology Stack](#technology-stack)
- [Component Structure](#component-structure)
- [State Management](#state-management)
- [Key Components](#key-components)
- [Data Flow](#data-flow)
- [API Integration](#api-integration)
- [UI/UX Patterns](#uiux-patterns)
- [Performance Optimizations](#performance-optimizations)

## Technology Stack

### Core Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1",    // Icons
    "jszip": "^3.10.1",            // ZIP file creation
    "file-saver": "^2.0.5"         // File downloads
  },
  "devDependencies": {
    "vite": "^4.4.5",              // Build tool
    "tailwindcss": "^3.3.0",       // Styling
    "@vitejs/plugin-react": "^4.0.3"
  }
}
```

### Why These Choices?

- **React**: Component-based architecture, hooks for state
- **Vite**: Lightning-fast HMR, optimized builds
- **Tailwind**: Utility-first CSS, dark theme built-in
- **Lucide**: Consistent icon set, tree-shakeable
- **No Redux**: Local state is sufficient for this app

## Component Structure

### Main Component Tree

```
App.jsx (pixflux-batch-generation)
├── Header
├── Messages (Error/Success)
├── API Key Input
├── Main Grid
│   ├── Generation Form (2 columns)
│   │   ├── Basic Settings
│   │   ├── Style Options  
│   │   ├── Advanced Options
│   │   ├── Wildcard Manager
│   │   │   ├── Wildcard List
│   │   │   └── Wildcard Editor Modal
│   │   ├── Batch Queue
│   │   │   ├── Queue Controls
│   │   │   ├── Queue Items
│   │   │   └── Statistics
│   │   └── Metadata Reader
│   └── Image Viewer (1 column)
│       ├── Gallery Navigation
│       ├── Image Display
│       ├── Selection Details
│       └── Download Controls
└── Inline Styles
```

### Component Design Principles

1. **Single File**: Everything in App.jsx for simplicity
2. **Collapsible Sections**: Manage UI density
3. **Modal Patterns**: Wildcard editor overlay
4. **Responsive Grid**: Works on all screen sizes

## State Management

### Core State Variables

```javascript
// API and Loading
const [apiKey, setApiKey] = useState('');
const [loading, setLoading] = useState(false);
const [serverConnected, setServerConnected] = useState(false);

// Messages
const [error, setError] = useState('');
const [successMessage, setSuccessMessage] = useState('');

// Images
const [generatedImages, setGeneratedImages] = useState([]);
const [currentImageIndex, setCurrentImageIndex] = useState(0);

// UI State
const [expandedSections, setExpandedSections] = useState({
  basic: true,
  style: true,
  advanced: false,
  wildcards: false,
  batch: true,
  metadata: false
});

// Form Data
const [formData, setFormData] = useState({
  description: '',
  negative_description: '',
  width: 64,
  height: 64,
  text_guidance_scale: 8.0,
  no_background: false,
  outline: 'single color black outline',
  shading: 'basic shading',
  detail: 'medium detail',
  seed: ''
});

// Wildcards
const [wildcardFiles, setWildcardFiles] = useState({});
const [activeWildcards, setActiveWildcards] = useState([]);

// Queue
const [queue, setQueue] = useState([]);
const [queueRunning, setQueueRunning] = useState(false);
const [batchDelay, setBatchDelay] = useState(2000);
const [batchCount, setBatchCount] = useState(1);

// Refs for async operations
const processingRef = useRef(false);
const queueRunningRef = useRef(false);
const abortControllerRef = useRef(null);
```

### State Update Patterns

```javascript
// Immutable updates
setQueue(prev => prev.map(item => 
  item.id === currentItem.id 
    ? { ...item, status: 'processing' }
    : item
));

// Callback pattern for dependent state
setFormData(prev => ({
  ...prev,
  [name]: type === 'checkbox' ? checked : value
}));

// Ref + State for async operations
queueRunningRef.current = queueRunning;
```

## Key Components

### Collapsible Section Pattern

```javascript
<div className="bg-gray-800 rounded-lg">
  <button
    onClick={() => toggleSection('basic')}
    className="w-full p-4 flex items-center justify-between hover:bg-gray-700"
  >
    <h2 className="text-xl font-semibold flex items-center gap-2">
      <Settings className="w-5 h-5" />
      Basic Settings
    </h2>
    {expandedSections.basic ? <ChevronUp /> : <ChevronDown />}
  </button>
  
  {expandedSections.basic && (
    <div className="p-6 pt-4">
      {/* Section content */}
    </div>
  )}
</div>
```

### Dynamic Form Controls

```javascript
// Range slider with visual fill
<div className="relative">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full h-2 bg-gray-700 rounded-lg overflow-hidden">
      <div 
        className="h-full bg-purple-600 rounded-lg transition-all duration-150"
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  </div>
  <input
    type="range"
    value={value}
    onChange={handleChange}
    className="relative w-full h-2 bg-transparent appearance-none cursor-pointer slider z-10"
  />
</div>
```

### Queue Item Component

```javascript
<div className={`relative p-3 rounded-lg border ${getQueueStatusColor(item.status)}`}>
  {/* Pulse animation for processing */}
  {item.status === 'processing' && (
    <div className="absolute inset-0 rounded-lg animate-pulse-ring" />
  )}
  
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0">
      {getQueueStatusIcon(item.status)}
    </div>
    
    <div className="flex-1 min-w-0">
      {/* Content with truncation */}
      <p className="text-sm line-clamp-2 break-words">
        {item.description}
      </p>
      
      {/* Dynamic selections preview */}
      {item.selections?.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {item.selections.slice(0, 3).map((sel, idx) => (
            <span key={idx} className="text-xs bg-gray-800 px-2 py-0.5 rounded">
              {sel.type === 'wildcard' ? '🎲' : '🔀'} {sel.selected}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
</div>
```

## Data Flow

### Generation Flow

```
User Input → Dynamic Processing → Queue Creation → API Call → Image Storage → Gallery Update
     ↓              ↓                    ↓             ↓            ↓              ↓
  Prompt      Wildcards/Vars      Unique Items    PixelLab    State Array    Auto-select
```

### Wildcard Flow

```
Server Files → API Fetch → Local State → UI Display → User Selection → Prompt Processing
      ↓            ↓           ↓             ↓              ↓                ↓
   .txt files   REST API   wildcardFiles  Checkboxes   activeWildcards   Substitution
```

### State Synchronization

```javascript
// Server ↔ Local State
useEffect(() => {
  async function loadWildcards() {
    try {
      const healthCheck = await fetch(`${API_URL}/health`);
      if (healthCheck.ok) {
        setServerConnected(true);
        const [wildcards, active] = await Promise.all([
          wildcardAPI.getAll(),
          wildcardAPI.getActive()
        ]);
        setWildcardFiles(wildcards);
        setActiveWildcards(active);
      }
    } catch (error) {
      setServerConnected(false);
      // Fallback to localStorage
    }
  }
  loadWildcards();
}, []);
```

## API Integration

### API Service Layer

```javascript
const wildcardAPI = {
  async getAll() {
    const response = await fetch(`${API_URL}/wildcards`);
    if (!response.ok) throw new Error('Failed to fetch');
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
  },
  
  // ... other methods
};
```

### Error Handling Pattern

```javascript
try {
  setLoading(true);
  const result = await apiCall();
  setSuccessMessage('Operation successful!');
} catch (error) {
  setError(error.message);
  // Specific error handling
  if (error.message.includes('Rate limit')) {
    // Stop queue, update UI
  }
} finally {
  setLoading(false);
}
```

## UI/UX Patterns

### Responsive Design

```javascript
// Grid system adapts to screen size
<div className="grid lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    {/* Form takes 2/3 on large screens */}
  </div>
  <div className="lg:col-span-1">
    {/* Viewer takes 1/3 on large screens */}
  </div>
</div>
```

### Visual Feedback

```javascript
// Status colors with meaning
const getQueueStatusColor = (status) => {
  switch (status) {
    case 'processing':
      return 'border-purple-500/50 bg-purple-900/10';
    case 'completed':
      return 'border-green-500/30 bg-green-900/10 opacity-80';
    case 'failed':
      return 'border-red-500/30 bg-red-900/10 opacity-80';
    default:
      return 'border-gray-600 bg-gray-800/50';
  }
};
```

### Interactive Elements

```javascript
// Hover states
className="hover:bg-gray-700 transition-colors"

// Active states  
className={isActive ? 'border-purple-500' : 'border-gray-600'}

// Loading states
{loading ? (
  <Loader2 className="w-5 h-5 animate-spin" />
) : (
  <Image className="w-5 h-5" />
)}
```

## Performance Optimizations

### Lazy Rendering

```javascript
// Only render expanded sections
{expandedSections.basic && (
  <div className="p-6 pt-4">
    {/* Heavy content here */}
  </div>
)}
```

### Ref Usage for Async

```javascript
// Refs prevent stale closures
const queueRunningRef = useRef(false);

// In async function
if (!queueRunningRef.current) {
  break; // Instantly responds to stop
}
```

### Image Management

```javascript
// Don't store base64 in state indefinitely
const imageData = {
  id: generateUniqueId(),
  url: imageUrl, // base64 data URL
  // ... metadata
};

// Encourage downloads to free memory
<button onClick={downloadAllAsZip}>
  Download All (Free Memory)
</button>
```

### Debounced Messages

```javascript
// Auto-clear messages
useEffect(() => {
  if (error) {
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }
}, [error]);
```

## Component Communication

### Props vs State

- **No prop drilling**: Single component architecture
- **Local state**: Each section manages its own expanded state
- **Shared state**: Form data, images, queue are app-level

### Event Handling

```javascript
// Direct handlers for simple cases
onClick={() => toggleSection('basic')}

// Named handlers for complex logic
const handleGenerate = () => {
  const newItems = createQueueItems();
  if (newItems.length === 0) return;
  
  setQueue(newItems);
  setQueueRunning(true);
  // ... more logic
};
```

## Best Practices Applied

1. **Separation of Concerns**
   - API logic in service layer
   - UI logic in components
   - Business logic in pure functions

2. **Error Boundaries**
   - Try-catch around all async operations
   - User-friendly error messages
   - Graceful degradation

3. **Accessibility**
   - Semantic HTML elements
   - ARIA labels where needed
   - Keyboard navigation support

4. **Performance**
   - Minimal re-renders
   - Lazy loading of sections
   - Efficient state updates

---

Next: [Backend API](./backend-api.md) - Express server architecture