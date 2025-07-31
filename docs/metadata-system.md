# 🏷️ Metadata System

The metadata system embeds complete generation information directly into PNG files, making every image self-documenting. This enables perfect reproducibility and generation transparency.

## 📝 Table of Contents

- [Overview](#overview)
- [PNG Structure](#png-structure)
- [Metadata Embedding](#metadata-embedding)
- [Metadata Extraction](#metadata-extraction)
- [Data Preserved](#data-preserved)
- [Implementation Details](#implementation-details)
- [Metadata Reader UI](#metadata-reader-ui)
- [Use Cases](#use-cases)

## Overview

### Why Embed Metadata?

1. **Portability**: Settings travel with the image
2. **Reproducibility**: Recreate exact conditions
3. **Transparency**: See all generation details
4. **No External Files**: Self-contained documentation
5. **Standard Compliant**: Uses PNG tEXt chunks

### How It Works

```
Generation → Create PNG → Embed Metadata → Download
                ↓
        Drop Image → Extract Metadata → View Details
```

## PNG Structure

### PNG Format Basics

```
PNG File Structure:
┌─────────────────┐
│  PNG Signature  │ (8 bytes)
├─────────────────┤
│   IHDR Chunk    │ (Image header)
├─────────────────┤
│   Other Chunks  │ (Image data, etc.)
├─────────────────┤
│  tEXt Chunks    │ ← Our metadata goes here
├─────────────────┤
│   IEND Chunk    │ (End marker)
└─────────────────┘
```

### tEXt Chunk Structure

```
┌──────────────┐
│ Length (4)   │ Big-endian integer
├──────────────┤
│ Type (4)     │ "tEXt"
├──────────────┤
│ Keyword      │ e.g., "PixelLab-Prompt"
├──────────────┤
│ Null (1)     │ 0x00 separator
├──────────────┤
│ Text         │ UTF-8 content
├──────────────┤
│ CRC (4)      │ Checksum
└──────────────┘
```

## Metadata Embedding

### Creating PNG with Metadata

```javascript
const createPNGWithMetadata = (base64Data, metadata) => {
  try {
    // Convert base64 to binary
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    // Find IEND chunk position
    let iendPos = -1;
    for (let i = bytes.length - 8; i >= 8; i--) {
      if (bytes[i] === 0x49 && bytes[i+1] === 0x45 && 
          bytes[i+2] === 0x4E && bytes[i+3] === 0x44) {
        iendPos = i - 4; // Back up to length field
        break;
      }
    }
    
    if (iendPos < 0) {
      console.error('Could not find IEND chunk');
      return bytes;
    }
    
    // Create metadata chunks
    const chunks = [];
    
    // Add all metadata fields
    addTextChunk('PixelLab-Prompt', metadata.prompt);
    addTextChunk('PixelLab-OriginalPrompt', metadata.originalPrompt);
    addTextChunk('PixelLab-Selections', JSON.stringify(metadata.selections));
    // ... more fields
    
    // Insert chunks before IEND
    // ... assembly logic
    
    return newPng;
  } catch (error) {
    console.error('Error creating PNG with metadata:', error);
    return bytes; // Return original on error
  }
};
```

### Adding tEXt Chunks

```javascript
const addTextChunk = (keyword, text) => {
  if (!text && text !== '0' && text !== 'false') return;
  
  const keywordBytes = stringToBytes(keyword);
  const textBytes = stringToBytes(String(text));
  
  // Create chunk data: keyword + null + text
  const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
  chunkData.set(keywordBytes, 0);
  chunkData[keywordBytes.length] = 0; // null separator
  chunkData.set(textBytes, keywordBytes.length + 1);
  
  // Create full chunk with length, type, data, CRC
  const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);
  const dataView = new DataView(chunk.buffer);
  
  // Length (big-endian)
  dataView.setUint32(0, chunkData.length, false);
  
  // Type: "tEXt"
  chunk[4] = 0x74; // t
  chunk[5] = 0x45; // E
  chunk[6] = 0x58; // X
  chunk[7] = 0x74; // t
  
  // Data
  chunk.set(chunkData, 8);
  
  // CRC of type + data
  const crcData = new Uint8Array(4 + chunkData.length);
  crcData.set(chunk.slice(4, 8), 0);
  crcData.set(chunkData, 4);
  dataView.setUint32(8 + chunkData.length, crc32(crcData), false);
  
  chunks.push(chunk);
};
```

### CRC32 Calculation

```javascript
const crc32 = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  
  return (data) => {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = (table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  };
})();
```

## Metadata Extraction

### Reading PNG Metadata

```javascript
const extractPNGMetadata = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const bytes = new Uint8Array(e.target.result);
        const metadata = {
          filename: file.name,
          fileSize: file.size,
          width: 'Unknown',
          height: 'Unknown'
        };
        
        // Read dimensions from IHDR
        if (bytes.length > 24) {
          const dataView = new DataView(bytes.buffer);
          metadata.width = dataView.getUint32(16, false);
          metadata.height = dataView.getUint32(20, false);
        }
        
        // Extract tEXt chunks
        let pos = 8; // Skip PNG signature
        
        while (pos < bytes.length - 12) {
          const chunkLength = new DataView(bytes.buffer, pos, 4).getUint32(0, false);
          const chunkType = bytesToString(bytes.slice(pos + 4, pos + 8));
          
          if (chunkType === 'tEXt') {
            const chunkData = bytes.slice(pos + 8, pos + 8 + chunkLength);
            
            // Find null separator
            let nullPos = -1;
            for (let i = 0; i < chunkData.length; i++) {
              if (chunkData[i] === 0) {
                nullPos = i;
                break;
              }
            }
            
            if (nullPos > 0) {
              const keyword = bytesToString(chunkData.slice(0, nullPos));
              const text = bytesToString(chunkData.slice(nullPos + 1));
              
              // Process PixelLab metadata
              if (keyword.startsWith('PixelLab-')) {
                const key = keyword.substring(9);
                // Map to metadata object
                // ...
              }
            }
          }
          
          // Move to next chunk
          pos += 8 + chunkLength + 4;
        }
        
        resolve(metadata);
      } catch (error) {
        console.error('Error extracting metadata:', error);
        resolve({ error: 'Could not extract metadata' });
      }
    };
    
    reader.readAsArrayBuffer(file);
  });
};
```

## Data Preserved

### Complete Metadata Fields

```javascript
{
  // Prompts
  prompt: "Final processed prompt sent to API",
  originalPrompt: "User's template with wildcards",
  negativePrompt: "Negative description if any",
  
  // Dynamic Selections
  selections: [
    {
      type: 'wildcard',
      original: '__styles__',
      selected: 'anime style',
      wildcardName: 'styles',
      placement: 'auto-appended'
    }
  ],
  
  // Image Settings
  width: 64,
  height: 64,
  outline: 'single color black outline',
  shading: 'basic shading',
  detail: 'medium detail',
  
  // Generation Settings
  guidanceScale: '8',
  noBackground: 'false',
  seed: '123456',
  
  // Metadata
  timestamp: '2024-01-15T10:30:00Z',
  generator: 'PixelLab AI Batch Generator v2.0',
  
  // Full settings object
  settings: { /* complete generation config */ }
}
```

### Download Function

```javascript
const downloadImage = (image) => {
  // Extract base64 data
  const base64Data = image.url.split(',')[1];
  
  // Create metadata object
  const metadata = {
    prompt: image.prompt,
    originalPrompt: image.originalPrompt,
    selections: image.selections,
    width: image.width,
    height: image.height,
    timestamp: image.timestamp,
    settings: image.settings,
    generator: 'PixelLab AI Batch Generator',
    // ... all other fields
  };
  
  // Convert to PNG with metadata
  const pngData = createPNGWithMetadata(base64Data, metadata);
  const blob = new Blob([pngData], { type: 'image/png' });
  
  // Create download
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const filename = `pixelart-${image.width}x${image.height}-${timestamp}.png`;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

## Metadata Reader UI

### Drag and Drop Interface

```javascript
<div
  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
    dragActive ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600'
  }`}
  onDragEnter={handleDrag}
  onDragLeave={handleDrag}
  onDragOver={handleDrag}
  onDrop={handleDrop}
>
  <input
    type="file"
    accept="image/*"
    onChange={handleFileSelect}
    className="hidden"
    id="metadata-file-input"
  />
  
  <label htmlFor="metadata-file-input" className="cursor-pointer">
    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
    <p className="text-lg font-medium mb-2">Drop an image here</p>
    <p className="text-sm text-gray-400">or click to browse</p>
  </label>
</div>
```

### Metadata Display

```javascript
{extractedMetadata && !metadataLoading && (
  <div className="mt-6 space-y-4">
    {/* Image Preview */}
    {extractedMetadata.imageUrl && (
      <div className="bg-gray-900 rounded-lg p-4">
        <img
          src={extractedMetadata.imageUrl}
          alt="Metadata preview"
          style={{ imageRendering: 'pixelated' }}
          className="border border-gray-700 rounded"
        />
      </div>
    )}

    {/* Prompts */}
    {extractedMetadata.prompt && (
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Prompts</h3>
        <p className="text-sm text-gray-300">{extractedMetadata.prompt}</p>
        {extractedMetadata.originalPrompt && (
          <p className="text-xs text-gray-500 mt-2">
            Template: {extractedMetadata.originalPrompt}
          </p>
        )}
      </div>
    )}

    {/* Dynamic Selections */}
    {extractedMetadata.selections && (
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Dynamic Selections</h3>
        <ul className="space-y-1">
          {extractedMetadata.selections.map((sel, idx) => (
            <li key={idx} className="text-xs">
              <span>{sel.type === 'wildcard' ? '🎲' : '🔀'}</span>
              <span className="text-purple-300">{sel.original}</span>
              <span>→</span>
              <span className="text-green-300">{sel.selected}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Generation Settings */}
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Generation Settings</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>Outline: {extractedMetadata.outline}</div>
        <div>Shading: {extractedMetadata.shading}</div>
        <div>Detail: {extractedMetadata.detail}</div>
        <div>Guidance: {extractedMetadata.guidanceScale}</div>
      </div>
    </div>
  </div>
)}
```

## Implementation Details

### Encoding/Decoding Helpers

```javascript
// Convert string to bytes for PNG chunks
const stringToBytes = (str) => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
};

// Convert bytes to string
const bytesToString = (bytes) => {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
};
```

### Unique ID Generation

```javascript
let idCounter = 0;
const generateUniqueId = () => {
  idCounter++;
  return `${Date.now()}-${idCounter}-${Math.random().toString(36).substr(2, 9)}`;
};
```

## Use Cases

### 1. Recreating Favorites
- Extract metadata from a successful image
- Copy the exact settings
- Generate variations with same parameters

### 2. Sharing Techniques
- Send PNG files with embedded settings
- Recipients can see exact generation details
- No need for separate documentation

### 3. Building Collections
- Analyze metadata from multiple images
- Identify successful patterns
- Create targeted wildcards

### 4. Debugging Issues
- Check what selections were made
- Verify settings were applied correctly
- Troubleshoot unexpected results

### 5. Version Control
- Track generation settings over time
- Compare different approaches
- Document evolution of techniques

## Best Practices

### 1. Metadata Completeness
- Include all relevant settings
- Preserve original templates
- Track selection details

### 2. File Management
- Use descriptive filenames
- Organize by project/style
- Regular backups

### 3. Privacy Considerations
- Be aware metadata is embedded
- Don't include sensitive information
- Strip metadata if sharing publicly

### 4. Storage Efficiency
- Metadata adds minimal file size
- Text compression is efficient
- Worth the benefits

---

Next: [Image Viewer](./image-viewer.md) - Gallery with selection transparency