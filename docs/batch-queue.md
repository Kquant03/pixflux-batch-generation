# 📋 Batch Queue System

The batch queue system enables generation of multiple images with intelligent rate limiting, visual feedback, and error handling. It's designed to respect API limits while maximizing throughput.

## 📝 Table of Contents

- [Overview](#overview)
- [Queue Architecture](#queue-architecture)
- [State Management](#state-management)
- [Visual Feedback](#visual-feedback)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Code Implementation](#code-implementation)
- [UI Components](#ui-components)

## Overview

### Key Features

- **Scalable Generation**: 1-100 images per batch
- **Rate Limit Protection**: Configurable delays (1-10 seconds)
- **Visual Status**: Real-time progress indicators
- **Error Recovery**: Graceful handling of failures
- **Pause/Resume**: Full control over processing
- **Selection Tracking**: Each item gets unique variations

### Queue States

```
pending → processing → completed
                   ↘
                    failed
```

## Queue Architecture

### Data Structure

```javascript
// Queue item structure
{
  id: "1234567890-1-abc123",          // Unique identifier
  description: "A dragon, anime style", // Processed prompt
  originalPrompt: "A dragon",          // Template
  selections: [...],                   // What was selected
  width: 64,
  height: 64,
  status: 'pending',                   // pending|processing|completed|failed
  error: null,                         // Error message if failed
  // ... other generation settings
}
```

### State Variables

```javascript
// Queue state management
const [queue, setQueue] = useState([]);
const [queueRunning, setQueueRunning] = useState(false);
const [processedCount, setProcessedCount] = useState(0);
const [batchDelay, setBatchDelay] = useState(2000);
const [batchCount, setBatchCount] = useState(1);

// Refs for async operations
const processingRef = useRef(false);
const queueRunningRef = useRef(false);
const abortControllerRef = useRef(null);
```

## State Management

### Creating Queue Items

```javascript
const createQueueItems = () => {
  if (!formData.description && activeWildcards.length === 0) {
    setError('Please enter a description or activate some wildcards');
    return [];
  }

  const items = [];
  
  for (let i = 0; i < batchCount; i++) {
    // Each item gets unique dynamic processing
    const { processedPrompt, selections } = processDynamicPrompt(formData.description);
    
    items.push({
      ...formData,
      description: processedPrompt,
      originalPrompt: formData.description,
      selections: selections,
      seed: formData.seed ? parseInt(formData.seed) + i : Math.floor(Math.random() * 1000000),
      id: generateUniqueId(),
      status: 'pending'
    });
  }
  
  return items;
};
```

### Processing Queue

```javascript
const processQueue = async (queueToProcess) => {
  if (processingRef.current) return;
  
  processingRef.current = true;
  
  try {
    const itemsToProcess = queueToProcess || queue.filter(item => item.status === 'pending');
    
    for (let i = 0; i < itemsToProcess.length; i++) {
      // Check if we should still be running
      if (!queueRunningRef.current) {
        break;
      }

      const currentItem = itemsToProcess[i];
      
      // Update status to processing
      setQueue(prev => prev.map(item => 
        item.id === currentItem.id 
          ? { ...item, status: 'processing' }
          : item
      ));
      
      try {
        setLoading(true);
        await generateImage(currentItem);
      } catch (err) {
        setError(err.message);
        setQueue(prev => prev.map(item => 
          item.id === currentItem.id 
            ? { ...item, status: 'failed', error: err.message }
            : item
        ));
        
        // Stop queue on rate limit
        if (err.message.includes('Rate limit')) {
          setQueueRunning(false);
          queueRunningRef.current = false;
          break;
        }
      } finally {
        setLoading(false);
      }
      
      // Wait before next item
      if (i < itemsToProcess.length - 1 && queueRunningRef.current) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }
  } finally {
    processingRef.current = false;
    setLoading(false);
    setQueueRunning(false);
    queueRunningRef.current = false;
  }
};
```

## Visual Feedback

### Status Indicators

```javascript
const getQueueStatusIcon = (status) => {
  switch (status) {
    case 'processing':
      return <Loader2 className="w-4 h-4 animate-spin text-purple-400" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-400" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};
```

### Status Colors

```javascript
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

### CSS Animations

```css
/* Pulse animation for processing items */
@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(147, 51, 234, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(147, 51, 234, 0);
  }
}

.animate-pulse-ring {
  animation: pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

## Rate Limiting

### Delay Configuration

```javascript
// Slider for delay between requests
<input
  type="range"
  value={batchDelay}
  onChange={(e) => setBatchDelay(parseInt(e.target.value))}
  min="1000"    // 1 second
  max="10000"   // 10 seconds
  step="500"
/>
```

### Rate Limit Handling

```javascript
// In generateImage function
if (response.status === 429) {
  throw new Error('Rate limit exceeded! Please increase delay or wait.');
}

// In processQueue catch block
if (err.message.includes('Rate limit')) {
  setQueueRunning(false);
  queueRunningRef.current = false;
  setQueue(prev => prev.map(item => 
    item.status === 'pending' 
      ? { ...item, status: 'failed', error: 'Queue stopped due to rate limit' }
      : item
  ));
  break;
}
```

### Recommended Settings

| Subscription | Recommended Delay | Max Batch Size |
|--------------|-------------------|----------------|
| Free Tier    | 3-5 seconds       | 10-20 images   |
| Paid Tier    | 1-2 seconds       | 50-100 images  |
| Large Batches| 5+ seconds        | Any size       |

## Error Handling

### Error Types

1. **API Errors**
   - Rate limits (429)
   - Authentication failures
   - Server errors

2. **Network Errors**
   - Connection timeouts
   - Network interruptions

3. **User Cancellation**
   - Manual stop
   - Page navigation

### Error Recovery

```javascript
// Abort controller for cancellation
const controller = new AbortController();
abortControllerRef.current = controller;

const response = await fetch(url, {
  signal: controller.signal
});

// Stop queue function
const stopQueue = () => {
  setQueueRunning(false);
  queueRunningRef.current = false;
  
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  setQueue(prev => prev.map(item => 
    item.status === 'pending' || item.status === 'processing'
      ? { ...item, status: 'failed', error: 'Cancelled by user' }
      : item
  ));
};
```

## Code Implementation

### Queue Control Functions

```javascript
// Add items to queue
const addToQueue = () => {
  const newItems = createQueueItems();
  if (newItems.length === 0) return;

  setQueue(prev => [...prev, ...newItems]);
  setSuccessMessage(`Added ${batchCount} items to queue`);
};

// Clear entire queue
const clearQueue = () => {
  if (queueRunning) {
    stopQueue();
  }
  setQueue([]);
  setProcessedCount(0);
  setSuccessMessage('Queue cleared');
};

// Remove single item
const removeFromQueue = (id) => {
  setQueue(prev => prev.filter(item => item.id !== id));
};

// Start processing
const startQueue = () => {
  setQueueRunning(true);
  queueRunningRef.current = true;
  processQueue();
};
```

### Generate Button Integration

```javascript
const handleGenerate = () => {
  const newItems = createQueueItems();
  if (newItems.length === 0) return;

  // Set the queue with new items
  setQueue(newItems);
  
  // Start processing immediately
  setQueueRunning(true);
  queueRunningRef.current = true;
  setSuccessMessage(`Starting generation of ${batchCount} image${batchCount !== 1 ? 's' : ''}...`);
  
  // Use setTimeout to ensure state updates before processing
  setTimeout(() => {
    processQueue(newItems);
  }, 100);
};
```

## UI Components

### Queue Display

```javascript
{queue.length > 0 && (
  <div className="bg-gray-900/50 rounded-lg p-3">
    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
      {queue.map((item, index) => (
        <div
          key={item.id}
          className={`relative p-3 rounded-lg border transition-all duration-300 ${getQueueStatusColor(item.status)}`}
        >
          {/* Status indicator animation */}
          {item.status === 'processing' && (
            <div className="absolute inset-0 rounded-lg animate-pulse-ring pointer-events-none" />
          )}
          
          <div className="flex items-start gap-3">
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {getQueueStatusIcon(item.status)}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-400">
                  #{index + 1}
                </span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400">
                  {item.width}×{item.height}
                </span>
              </div>
              
              <p className="text-sm text-gray-200 line-clamp-2 break-words pr-2">
                {item.description}
              </p>
              
              {/* Error message */}
              {item.error && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {item.error}
                </p>
              )}
              
              {/* Selections preview */}
              {item.selections && item.selections.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {item.selections.slice(0, 3).map((sel, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 text-xs bg-gray-800 px-2 py-0.5 rounded"
                    >
                      <span>{sel.type === 'wildcard' ? '🎲' : '🔀'}</span>
                      <span className="text-gray-400 truncate max-w-[150px]">
                        {sel.selected}
                      </span>
                    </span>
                  ))}
                  {item.selections.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{item.selections.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Remove button */}
            <button
              onClick={() => removeFromQueue(item.id)}
              className="flex-shrink-0 text-gray-500 hover:text-gray-300"
              title="Remove from queue"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

### Queue Statistics

```javascript
{queue.length > 0 && (
  <div className="grid grid-cols-3 gap-4 text-center">
    <div className="bg-gray-700/30 rounded-lg p-3">
      <p className="text-2xl font-bold text-gray-300">
        {queue.filter(i => i.status === 'pending').length}
      </p>
      <p className="text-xs text-gray-500">Pending</p>
    </div>
    <div className="bg-green-900/20 rounded-lg p-3">
      <p className="text-2xl font-bold text-green-400">
        {queue.filter(i => i.status === 'completed').length}
      </p>
      <p className="text-xs text-gray-500">Completed</p>
    </div>
    <div className="bg-red-900/20 rounded-lg p-3">
      <p className="text-2xl font-bold text-red-400">
        {queue.filter(i => i.status === 'failed').length}
      </p>
      <p className="text-xs text-gray-500">Failed</p>
    </div>
  </div>
)}
```

## Best Practices

### 1. Batch Size Strategy
- Start small (5-10) to test prompts
- Increase once variations are refined
- Consider API limits for size

### 2. Delay Configuration
- Monitor for rate limit errors
- Increase delay if seeing 429 errors
- Balance speed vs reliability

### 3. Error Recovery
- Save successful images regularly
- Note failed items for retry
- Adjust settings based on failures

### 4. Memory Management
- Download completed batches
- Clear queue when done
- Don't accumulate too many images

---

Next: [Metadata System](./metadata-system.md) - Learn about PNG metadata embedding