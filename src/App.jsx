import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Loader2, Sparkles, Settings, Image, X, Save, Play, Pause, Shuffle, List, Wand2, Copy, Check, AlertCircle, ChevronDown, ChevronUp, FolderOpen, FileText, Plus, Trash2, Edit, Eye, EyeOff, Package, ChevronLeft, ChevronRight, Maximize2, Clock, CheckCircle, XCircle, Upload, FileImage, Info, Calendar, Sliders } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Fix for unique ID generation - use counter + timestamp + random
let idCounter = 0;
const generateUniqueId = () => {
  idCounter++;
  return `${Date.now()}-${idCounter}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to convert string to bytes for PNG chunks
const stringToBytes = (str) => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
};

// Helper to convert bytes to string
const bytesToString = (bytes) => {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
};

// CRC32 calculation for PNG chunks
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

// Helper function to create PNG with metadata
const createPNGWithMetadata = (base64Data, metadata) => {
  try {
    // Convert base64 to binary
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    console.log('PNG size:', bytes.length);
    
    // Find IEND chunk position - IEND is always the last chunk
    // IEND chunk structure: 00 00 00 00 49 45 4E 44 AE 42 60 82
    let iendPos = -1;
    
    // Search from the end for IEND chunk type
    for (let i = bytes.length - 8; i >= 8; i--) {
      // Check for IEND chunk type bytes
      if (bytes[i] === 0x49 && bytes[i+1] === 0x45 && bytes[i+2] === 0x4E && bytes[i+3] === 0x44) {
        // Found IEND type, back up to get the chunk start (4 bytes before for length)
        iendPos = i - 4;
        console.log('Found IEND at position:', iendPos);
        break;
      }
    }
    
    if (iendPos < 0) {
      console.error('Could not find IEND chunk in PNG');
      // Try to return the original image
      return bytes;
    }
    
    // Create tEXt chunks for metadata
    const chunks = [];
    
    // Add each metadata field as a separate tEXt chunk
    const addTextChunk = (keyword, text) => {
      if (!text && text !== '0' && text !== 'false') return; // Skip empty values except 0 and false
      
      const keywordBytes = stringToBytes(keyword);
      const textBytes = stringToBytes(String(text)); // Ensure text is a string
      
      console.log(`Adding chunk: ${keyword} = ${String(text).substring(0, 50)}...`);
      
      // Chunk structure: length (4) + type (4) + keyword + null + text + crc (4)
      const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
      chunkData.set(keywordBytes, 0);
      chunkData[keywordBytes.length] = 0; // null separator
      chunkData.set(textBytes, keywordBytes.length + 1);
      
      // Create full chunk
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
    
    // Add all metadata as chunks
    console.log('Adding metadata chunks...');
    addTextChunk('PixelLab-Prompt', metadata.prompt);
    addTextChunk('PixelLab-OriginalPrompt', metadata.originalPrompt);
    addTextChunk('PixelLab-NegativePrompt', metadata.negative_description);
    addTextChunk('PixelLab-Selections', JSON.stringify(metadata.selections || []));
    addTextChunk('PixelLab-Width', String(metadata.width));
    addTextChunk('PixelLab-Height', String(metadata.height));
    addTextChunk('PixelLab-Outline', metadata.outline);
    addTextChunk('PixelLab-Shading', metadata.shading);
    addTextChunk('PixelLab-Detail', metadata.detail);
    addTextChunk('PixelLab-GuidanceScale', String(metadata.text_guidance_scale || 8));
    addTextChunk('PixelLab-NoBackground', String(metadata.no_background || false));
    addTextChunk('PixelLab-Seed', String(metadata.seed || ''));
    addTextChunk('PixelLab-Timestamp', metadata.timestamp || new Date().toISOString());
    addTextChunk('PixelLab-Settings', JSON.stringify(metadata.settings || {}));
    addTextChunk('PixelLab-Generator', 'Pixflux Batch Generation v2.0');
    
    console.log(`Created ${chunks.length} metadata chunks`);
    
    // Calculate total size
    let totalChunkSize = 0;
    chunks.forEach(chunk => totalChunkSize += chunk.length);
    
    // Create new PNG with metadata
    const newPng = new Uint8Array(iendPos + totalChunkSize + 12); // 12 bytes for IEND chunk
    
    // Copy original PNG up to IEND
    newPng.set(bytes.slice(0, iendPos), 0);
    
    // Insert metadata chunks
    let offset = iendPos;
    chunks.forEach(chunk => {
      newPng.set(chunk, offset);
      offset += chunk.length;
    });
    
    // Copy IEND chunk (should be 12 bytes: 4 length + 4 type + 4 CRC)
    newPng.set(bytes.slice(iendPos, iendPos + 12), offset);
    
    console.log('PNG metadata embedding complete');
    return newPng;
    
  } catch (error) {
    console.error('Error creating PNG with metadata:', error);
    // Return original bytes on error
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    return bytes;
  }
};

// Helper to extract metadata from PNG
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
        
        // Read PNG signature and IHDR for dimensions
        if (bytes.length > 24) {
          const dataView = new DataView(bytes.buffer);
          // IHDR is always the first chunk after signature
          metadata.width = dataView.getUint32(16, false);
          metadata.height = dataView.getUint32(20, false);
        }
        
        console.log('Starting PNG metadata extraction...');
        
        // Extract tEXt chunks
        let pos = 8; // Skip PNG signature
        let chunksFound = 0;
        
        while (pos < bytes.length - 12) {
          const chunkLength = new DataView(bytes.buffer, pos, 4).getUint32(0, false);
          const chunkType = bytesToString(bytes.slice(pos + 4, pos + 8));
          
          if (chunkType === 'tEXt') {
            chunksFound++;
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
              
              console.log(`Found chunk: ${keyword}`);
              
              // Parse PixelLab metadata
              if (keyword.startsWith('PixelLab-')) {
                const key = keyword.substring(9);
                console.log(`Processing PixelLab key: ${key} with value: ${text.substring(0, 50)}...`);
                
                // Direct field mapping - ensure all fields are captured
                switch(key) {
                  case 'Prompt':
                    metadata.prompt = text;
                    break;
                  case 'OriginalPrompt':
                    metadata.originalPrompt = text;
                    break;
                  case 'NegativePrompt':
                    metadata.negativePrompt = text;
                    break;
                  case 'Selections':
                    try {
                      metadata.selections = JSON.parse(text);
                    } catch {
                      metadata.selections = [];
                    }
                    break;
                  case 'Width':
                    metadata.width = text;
                    break;
                  case 'Height':
                    metadata.height = text;
                    break;
                  case 'Outline':
                    metadata.outline = text;
                    break;
                  case 'Shading':
                    metadata.shading = text;
                    break;
                  case 'Detail':
                    metadata.detail = text;
                    break;
                  case 'GuidanceScale':
                    metadata.guidanceScale = text;
                    break;
                  case 'NoBackground':
                    metadata.noBackground = text;
                    break;
                  case 'Seed':
                    metadata.seed = text;
                    break;
                  case 'Timestamp':
                    metadata.timestamp = text;
                    break;
                  case 'Settings':
                    try {
                      metadata.settings = JSON.parse(text);
                    } catch {
                      metadata.settings = null;
                    }
                    break;
                  case 'Generator':
                    metadata.generator = text;
                    break;
                  default:
                    // Store any other PixelLab fields with lowercase key
                    metadata[key.toLowerCase()] = text;
                }
              }
            }
          }
          
          // Move to next chunk
          pos += 8 + chunkLength + 4; // length + type + data + crc
          
          // Safety check
          if (pos > bytes.length || chunkLength > bytes.length) {
            break;
          }
        }
        
        console.log(`Extraction complete. Found ${chunksFound} tEXt chunks`);
        console.log('Extracted metadata:', metadata);
        
        resolve(metadata);
      } catch (error) {
        console.error('Error extracting metadata:', error);
        resolve({
          error: 'Could not extract metadata',
          filename: file.name,
          fileSize: file.size
        });
      }
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export default function PixelLabImageGenerator() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [serverConnected, setServerConnected] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    style: true,
    advanced: false,
    wildcards: false,
    batch: true,
    metadata: false
  });
  
  // Metadata reader state
  const [dragActive, setDragActive] = useState(false);
  const [extractedMetadata, setExtractedMetadata] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  
  // Batch queue state
  const [queue, setQueue] = useState([]);
  const [queueRunning, setQueueRunning] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [batchDelay, setBatchDelay] = useState(2000);
  const [batchCount, setBatchCount] = useState(1);
  const processingRef = useRef(false);
  const queueRunningRef = useRef(false);
  const abortControllerRef = useRef(null);
  
  // Wildcard system state
  const [wildcardFiles, setWildcardFiles] = useState({});
  const [activeWildcards, setActiveWildcards] = useState([]);
  const [showWildcardEditor, setShowWildcardEditor] = useState(false);
  const [editingWildcard, setEditingWildcard] = useState(null);
  const [newWildcardName, setNewWildcardName] = useState('');
  const [newWildcardContent, setNewWildcardContent] = useState('');
  
  // Form state
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

  const outlineOptions = [
    'single color black outline',
    'selective outline',
    'lineless',
    'thick outline',
    'colored outline'
  ];

  const shadingOptions = [
    'flat shading',
    'basic shading',
    'medium shading',
    'detailed shading',
    'highly detailed shading'
  ];

  const detailOptions = [
    'low detail',
    'medium detail',
    'highly detailed'
  ];

  // Common size presets
  const sizePresets = {
    'Square (Icons/Items)': [
      { size: '32x32', width: 32, height: 32, tier: 'free' },
      { size: '48x48', width: 48, height: 48, tier: 'free' },
      { size: '64x64', width: 64, height: 64, tier: 'free' },
      { size: '96x96', width: 96, height: 96, tier: 'free' },
      { size: '128x128', width: 128, height: 128, tier: 'free' },
      { size: '192x192', width: 192, height: 192, tier: 'free' }
    ],
    'Characters (2:3 ratio)': [
      { size: '32x48', width: 32, height: 48, tier: 'free' },
      { size: '48x64', width: 48, height: 64, tier: 'free' },
      { size: '64x96', width: 64, height: 96, tier: 'free' },
      { size: '96x144', width: 96, height: 144, tier: 'free' }
    ],
    'Scenery (16:9 ratio)': [
      { size: '64x36', width: 64, height: 36, tier: 'free' },
      { size: '96x54', width: 96, height: 54, tier: 'free' },
      { size: '128x72', width: 128, height: 72, tier: 'free' },
      { size: '160x90', width: 160, height: 90, tier: 'free' },
      { size: '192x108', width: 192, height: 108, tier: 'free' }
    ]
  };

  const [selectedCategory, setSelectedCategory] = useState('Square (Icons/Items)');

  // API configuration
  const API_URL = 'http://localhost:3001/api';
  
  // Wildcard API functions
  const wildcardAPI = {
    async getAll() {
      try {
        const response = await fetch(`${API_URL}/wildcards`);
        if (!response.ok) throw new Error('Failed to fetch wildcards');
        const data = await response.json();
        return data.wildcards;
      } catch (error) {
        console.error('Error fetching wildcards:', error);
        throw error;
      }
    },
    
    async getActive() {
      try {
        const response = await fetch(`${API_URL}/wildcards/active`);
        if (!response.ok) throw new Error('Failed to fetch active wildcards');
        const data = await response.json();
        return data.active;
      } catch (error) {
        console.error('Error fetching active wildcards:', error);
        throw error;
      }
    },
    
    async updateActive(active) {
      try {
        const response = await fetch(`${API_URL}/wildcards/active`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active })
        });
        if (!response.ok) throw new Error('Failed to update active wildcards');
        return await response.json();
      } catch (error) {
        console.error('Error updating active wildcards:', error);
        throw error;
      }
    },
    
    async save(name, content) {
      try {
        const response = await fetch(`${API_URL}/wildcards/${name}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        if (!response.ok) throw new Error('Failed to save wildcard');
        return await response.json();
      } catch (error) {
        console.error('Error saving wildcard:', error);
        throw error;
      }
    },
    
    async delete(name) {
      try {
        const response = await fetch(`${API_URL}/wildcards/${name}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete wildcard');
        return await response.json();
      } catch (error) {
        console.error('Error deleting wildcard:', error);
        throw error;
      }
    },
    
    async rename(oldName, newName) {
      try {
        const response = await fetch(`${API_URL}/wildcards/${oldName}/rename`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName })
        });
        if (!response.ok) throw new Error('Failed to rename wildcard');
        return await response.json();
      } catch (error) {
        console.error('Error renaming wildcard:', error);
        throw error;
      }
    }
  };

  // Load wildcards from API on mount
  useEffect(() => {
    async function loadWildcards() {
      try {
        // Check if API is available
        const healthCheck = await fetch(`${API_URL}/health`).catch(() => null);
        
        if (healthCheck && healthCheck.ok) {
          // API is available, use it
          setServerConnected(true);
          const [wildcards, active] = await Promise.all([
            wildcardAPI.getAll(),
            wildcardAPI.getActive()
          ]);
          
          setWildcardFiles(wildcards);
          setActiveWildcards(active);
          setSuccessMessage('Wildcards loaded from server');
        } else {
          // API not available, check localStorage for migration
          setServerConnected(false);
          const savedWildcards = localStorage.getItem('pixellab-wildcards');
          const savedActive = localStorage.getItem('pixellab-active-wildcards');
          
          if (savedWildcards) {
            const parsed = JSON.parse(savedWildcards);
            setWildcardFiles(parsed);
            
            if (savedActive) {
              setActiveWildcards(JSON.parse(savedActive));
            }
            
            setError('Wildcard server not available. Using local storage. Start the server with: node server.js');
          } else {
            // No wildcards anywhere, start fresh
            setWildcardFiles({});
            setActiveWildcards([]);
            setError('No wildcards found. Start the server to create defaults: node server.js');
          }
        }
      } catch (error) {
        console.error('Error loading wildcards:', error);
        setServerConnected(false);
        setError('Failed to load wildcards. Make sure the server is running on port 3001');
      }
    }
    
    loadWildcards();
  }, []);

  // Update refs when state changes
  useEffect(() => {
    queueRunningRef.current = queueRunning;
  }, [queueRunning]);

  // Clear messages after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Keyboard navigation for image viewer
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (generatedImages.length === 0) return;
      
      if (e.key === 'ArrowLeft') {
        navigateImage('prev');
      } else if (e.key === 'ArrowRight') {
        navigateImage('next');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [generatedImages.length, currentImageIndex]);

  const navigateImage = (direction) => {
    if (direction === 'prev') {
      setCurrentImageIndex(prev => 
        prev > 0 ? prev - 1 : generatedImages.length - 1
      );
    } else {
      setCurrentImageIndex(prev => 
        prev < generatedImages.length - 1 ? prev + 1 : 0
      );
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'no_background' && checked) {
      if (formData.width > 128 || formData.height > 128) {
        setFormData(prev => ({
          ...prev,
          no_background: checked,
          width: 64,
          height: 64
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSizeSelect = (width, height) => {
    setFormData(prev => ({
      ...prev,
      width,
      height
    }));
  };

  // Wildcard management - Now using API
  const toggleWildcard = async (name) => {
    const newActive = activeWildcards.includes(name)
      ? activeWildcards.filter(w => w !== name)
      : [...activeWildcards, name];
    
    setActiveWildcards(newActive);
    
    // Update on server
    try {
      await wildcardAPI.updateActive(newActive);
    } catch (error) {
      console.error('Failed to update active wildcards on server:', error);
      // Still update locally even if server fails
    }
  };

  // Function to add __wildcard__ to prompt
  const addWildcardPlaceholder = (wildcardName) => {
    setFormData(prev => {
      const currentPrompt = prev.description.trim();
      const wildcardText = `__${wildcardName}__`;
      
      // If prompt is empty, just add the wildcard
      if (!currentPrompt) {
        return { ...prev, description: wildcardText };
      }
      
      // If prompt doesn't end with comma or space, add comma and space
      const needsComma = !currentPrompt.endsWith(',') && !currentPrompt.endsWith(' ');
      const separator = needsComma ? ', ' : '';
      
      return { ...prev, description: currentPrompt + separator + wildcardText };
    });
    
    setSuccessMessage(`Added __${wildcardName}__ placeholder to prompt`);
  };

  const saveWildcard = async () => {
    if (!newWildcardName.trim() || !newWildcardContent.trim()) {
      setError('Please provide both a name and content for the wildcard');
      return;
    }

    const wildcardKey = newWildcardName.toLowerCase().replace(/\s+/g, '_');
    
    try {
      // If editing and the name changed, we need to handle the rename
      if (editingWildcard && editingWildcard !== wildcardKey) {
        // First get the current content
        const currentContent = wildcardFiles[editingWildcard];
        
        // Save the new wildcard
        await wildcardAPI.save(wildcardKey, newWildcardContent.trim());
        
        // Delete the old one
        await wildcardAPI.delete(editingWildcard);
        
        // Update local state
        const updatedWildcards = { ...wildcardFiles };
        delete updatedWildcards[editingWildcard];
        updatedWildcards[wildcardKey] = newWildcardContent.trim();
        setWildcardFiles(updatedWildcards);
        
        // Update active wildcards if the old one was active
        if (activeWildcards.includes(editingWildcard)) {
          const newActive = activeWildcards.filter(w => w !== editingWildcard);
          newActive.push(wildcardKey);
          setActiveWildcards(newActive);
          await wildcardAPI.updateActive(newActive);
        }
      } else {
        // Normal save or update
        await wildcardAPI.save(wildcardKey, newWildcardContent.trim());
        
        const updatedWildcards = {
          ...wildcardFiles,
          [wildcardKey]: newWildcardContent.trim()
        };
        setWildcardFiles(updatedWildcards);
        
        // Auto-activate new wildcard
        if (!activeWildcards.includes(wildcardKey)) {
          const newActive = [...activeWildcards, wildcardKey];
          setActiveWildcards(newActive);
          await wildcardAPI.updateActive(newActive);
        }
      }
      
      setNewWildcardName('');
      setNewWildcardContent('');
      setShowWildcardEditor(false);
      setEditingWildcard(null);
      setSuccessMessage('Wildcard saved successfully!');
    } catch (error) {
      setError('Failed to save wildcard: ' + error.message);
    }
  };

  const deleteWildcard = async (name) => {
    if (confirm(`Delete wildcard "${name}"?`)) {
      try {
        await wildcardAPI.delete(name);
        
        const updatedWildcards = { ...wildcardFiles };
        delete updatedWildcards[name];
        setWildcardFiles(updatedWildcards);
        
        // Remove from active if it was active
        if (activeWildcards.includes(name)) {
          const newActive = activeWildcards.filter(w => w !== name);
          setActiveWildcards(newActive);
          await wildcardAPI.updateActive(newActive);
        }
        
        setSuccessMessage('Wildcard deleted successfully!');
      } catch (error) {
        setError('Failed to delete wildcard: ' + error.message);
      }
    }
  };

  const editWildcard = (name) => {
    setEditingWildcard(name);
    setNewWildcardName(name);
    setNewWildcardContent(wildcardFiles[name]);
    setShowWildcardEditor(true);
  };

  // Dynamic prompt processing - NEW VERSION
  const processWildcard = (match, wildcardName) => {
    const cleanName = wildcardName.trim();
    
    // Check if wildcard exists
    if (!wildcardFiles[cleanName]) {
      console.log(`Wildcard ${cleanName} doesn't exist`);
      return match; // Return original if doesn't exist
    }
    
    const wildcardContent = wildcardFiles[cleanName];
    const options = wildcardContent.split('\n').filter(line => line.trim());
    
    if (options.length === 0) {
      return match;
    }
    
    const selected = options[Math.floor(Math.random() * options.length)].trim();
    console.log(`Wildcard ${cleanName} selected: ${selected}`);
    return selected;
  };

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
    
    // Process variations: {option1|option2|option3}
    const variationRegex = /\{([^}]+)\}/g;
    processedPrompt = processedPrompt.replace(variationRegex, (match, options) => {
      const choices = options.split('|').map(s => s.trim());
      const selected = choices[Math.floor(Math.random() * choices.length)];
      selections.push({
        type: 'variation',
        original: match,
        selected: selected
      });
      return selected;
    });
    
    // Now append active wildcards in random order
    const shuffledActiveWildcards = [...activeWildcards].sort(() => Math.random() - 0.5);
    const appendedWildcards = [];
    
    shuffledActiveWildcards.forEach(wildcardName => {
      if (wildcardFiles[wildcardName]) {
        const options = wildcardFiles[wildcardName].split('\n').filter(line => line.trim());
        if (options.length > 0) {
          const selected = options[Math.floor(Math.random() * options.length)].trim();
          appendedWildcards.push(selected);
          selections.push({
            type: 'wildcard',
            original: `__${wildcardName}__`,
            selected: selected,
            wildcardName: wildcardName,
            placement: 'auto-appended'
          });
        }
      }
    });
    
    // Append the wildcard selections to the prompt
    if (appendedWildcards.length > 0) {
      if (processedPrompt.trim()) {
        processedPrompt = processedPrompt.trim() + ', ' + appendedWildcards.join(', ');
      } else {
        processedPrompt = appendedWildcards.join(', ');
      }
    }
    
    return { processedPrompt, selections };
  };

  // Fixed queue management functions
  const createQueueItems = () => {
    if (!formData.description && activeWildcards.length === 0) {
      setError('Please enter a description or activate some wildcards');
      return [];
    }

    const items = [];
    
    for (let i = 0; i < batchCount; i++) {
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

  const generateImage = async (queueItem) => {
    if (!apiKey) {
      throw new Error('No API key provided');
    }

    try {
      const requestBody = {
        description: queueItem.description,
        image_size: {
          width: parseInt(queueItem.width),
          height: parseInt(queueItem.height)
        },
        text_guidance_scale: parseFloat(queueItem.text_guidance_scale),
        no_background: queueItem.no_background,
        outline: queueItem.outline,
        shading: queueItem.shading,
        detail: queueItem.detail
      };

      if (queueItem.negative_description) {
        requestBody.negative_description = queueItem.negative_description;
      }

      if (queueItem.seed) {
        requestBody.seed = parseInt(queueItem.seed);
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch('https://api.pixellab.ai/v1/generate-image-pixflux', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `API Error: ${response.status}`;
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded! Please increase delay or wait.');
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.image && data.image.base64) {
        const imageUrl = `data:image/png;base64,${data.image.base64}`;
        const imageData = {
          id: queueItem.id,
          url: imageUrl,
          prompt: queueItem.description,
          originalPrompt: queueItem.originalPrompt,
          selections: queueItem.selections || [],
          width: queueItem.width,
          height: queueItem.height,
          timestamp: new Date().toISOString(),
          settings: { ...queueItem },
          negative_description: queueItem.negative_description,
          outline: queueItem.outline,
          shading: queueItem.shading,
          detail: queueItem.detail,
          text_guidance_scale: queueItem.text_guidance_scale,
          no_background: queueItem.no_background,
          seed: queueItem.seed
        };
        
        setGeneratedImages(prev => {
          const newImages = [imageData, ...prev];
          // Auto-select the newest image
          setCurrentImageIndex(0);
          return newImages;
        });
        
        // Update queue status
        setQueue(prev => prev.map(item => 
          item.id === queueItem.id 
            ? { ...item, status: 'completed' }
            : item
        ));
        
        setProcessedCount(prev => prev + 1);
        
        return imageData;
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Generation cancelled');
      }
      throw err;
    }
  };

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
            setQueue(prev => prev.map(item => 
              item.status === 'pending' 
                ? { ...item, status: 'failed', error: 'Queue stopped due to rate limit' }
                : item
            ));
            break;
          }
        } finally {
          setLoading(false);
        }
        
        // Check again if we should continue
        if (!queueRunningRef.current) {
          break;
        }
        
        // Wait before next item (except for the last one)
        if (i < itemsToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      }
      
      // Queue complete
      setQueueRunning(false);
      queueRunningRef.current = false;
      const completed = queue.filter(item => item.status === 'completed').length;
      setSuccessMessage(`Batch complete! Generated ${completed} images.`);
      setProcessedCount(0);
      
    } finally {
      processingRef.current = false;
      setLoading(false);
      setQueueRunning(false);
      queueRunningRef.current = false;
    }
  };

  // Fixed main generate function
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

  // Queue control functions
  const addToQueue = () => {
    const newItems = createQueueItems();
    if (newItems.length === 0) return;

    setQueue(prev => [...prev, ...newItems]);
    setSuccessMessage(`Added ${batchCount} items to queue`);
  };

  const clearQueue = () => {
    if (queueRunning) {
      stopQueue();
    }
    setQueue([]);
    setProcessedCount(0);
    setSuccessMessage('Queue cleared');
  };

  const removeFromQueue = (id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const startQueue = () => {
    setQueueRunning(true);
    queueRunningRef.current = true;
    processQueue();
  };

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

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      setMetadataLoading(true);
      try {
        const metadata = await extractPNGMetadata(imageFile);
        setExtractedMetadata(metadata);
        
        // Also try to load the image for preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setExtractedMetadata(prev => ({
            ...prev,
            imageUrl: e.target.result
          }));
        };
        reader.readAsDataURL(imageFile);
        
      } catch (error) {
        setError('Failed to extract metadata from image');
      } finally {
        setMetadataLoading(false);
      }
    } else {
      setError('Please drop a valid image file');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setMetadataLoading(true);
      try {
        const metadata = await extractPNGMetadata(file);
        setExtractedMetadata(metadata);
        
        // Load image preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setExtractedMetadata(prev => ({
            ...prev,
            imageUrl: e.target.result
          }));
        };
        reader.readAsDataURL(file);
        
      } catch (error) {
        setError('Failed to extract metadata from image');
      } finally {
        setMetadataLoading(false);
      }
    }
  };

  const downloadImage = (image) => {
    if (!image || !image.url) {
      setError('No image to download');
      return;
    }
    
    // Extract base64 data
    const base64Data = image.url.split(',')[1];
    if (!base64Data) {
      setError('Invalid image data');
      return;
    }
    
    // Create metadata for embedding
    const metadata = {
      prompt: image.prompt,
      originalPrompt: image.originalPrompt,
      selections: image.selections,
      width: image.width,
      height: image.height,
      timestamp: image.timestamp,
      settings: image.settings,
      generator: 'PixelLab AI Batch Generator',
      api: 'pixellab.ai',
      negative_description: image.negative_description,
      outline: image.outline,
      shading: image.shading,
      detail: image.detail,
      text_guidance_scale: image.text_guidance_scale,
      no_background: image.no_background,
      seed: image.seed
    };
    
    // Convert to blob with metadata
    const pngData = createPNGWithMetadata(base64Data, metadata);
    const blob = new Blob([pngData], { type: 'image/png' });
    
    // Create download link
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
    
    setSuccessMessage('Image downloaded!');
  };

  const downloadAllAsZip = async () => {
    if (generatedImages.length === 0) {
      setError('No images to download');
      return;
    }

    setLoading(true);
    setSuccessMessage('Preparing zip file...');

    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder('pixelart-batch');

      // Process each image
      for (let i = 0; i < generatedImages.length; i++) {
        const image = generatedImages[i];
        const timestamp = new Date(image.timestamp).toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `pixelart-${image.width}x${image.height}-${timestamp}-${i + 1}.png`;

        // Convert base64 to blob
        const base64Data = image.url.split(',')[1];
        const metadata = {
          prompt: image.prompt,
          originalPrompt: image.originalPrompt,
          selections: image.selections,
          width: image.width,
          height: image.height,
          timestamp: image.timestamp,
          settings: image.settings,
          generator: 'PixelLab AI Batch Generator',
          api: 'pixellab.ai',
          negative_description: image.negative_description,
          outline: image.outline,
          shading: image.shading,
          detail: image.detail,
          text_guidance_scale: image.text_guidance_scale,
          no_background: image.no_background,
          seed: image.seed
        };
        
        const pngData = createPNGWithMetadata(base64Data, metadata);
        imagesFolder.file(filename, pngData, { binary: true });
      }

      // Add a metadata file
      const metadata = generatedImages.map((img, i) => ({
        index: i + 1,
        prompt: img.prompt,
        originalPrompt: img.originalPrompt,
        selections: img.selections || [],
        width: img.width,
        height: img.height,
        timestamp: img.timestamp,
        settings: img.settings
      }));

      imagesFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(content, `pixelart-batch-${timestamp}.zip`);
      
      setSuccessMessage(`Downloaded ${generatedImages.length} images as zip!`);
    } catch (err) {
      setError('Failed to create zip file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt);
    setSuccessMessage('Prompt copied to clipboard!');
  };

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

  const currentImage = generatedImages[currentImageIndex];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 py-6">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
            <Sparkles className="text-purple-400" />
            Pixflux Batch Generation
            <Sparkles className="text-purple-400" />
          </h1>
          <p className="text-gray-400">Generate multiple pixel art variations with custom wildcards</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-lg text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {/* API Key Input */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <label className="block text-sm font-medium mb-2">API Secret Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your PixelLab API secret"
            className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            Get your API secret from{' '}
            <a href="https://www.pixellab.ai/pixellab-api" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
              pixellab.ai
            </a>
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Generation Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic Settings */}
            <div className="bg-gray-800 rounded-lg">
              <button
                onClick={() => toggleSection('basic')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors rounded-t-lg"
              >
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Basic Settings
                </h2>
                {expandedSections.basic ? <ChevronUp /> : <ChevronDown />}
              </button>
              
              {expandedSections.basic && (
                <div className="p-6 pt-4">
                  {/* Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="A {cute|scary|mystical} dragon"
                      className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none font-mono text-sm"
                      rows="4"
                    />
                    <div className="mt-2 text-xs text-gray-400">
                      <p className="font-medium text-purple-400 mb-1">⚡ Dynamic Prompt Features:</p>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>• <span className="text-purple-400">{'{cute|scary|mystical}'}</span> → randomly picks one option</li>
                        <li>• <span className="text-purple-400">__wildcard__</span> → places wildcard at specific position</li>
                        <li>• <span className="text-green-400">Active wildcards auto-append</span> → {activeWildcards.length} active</li>
                      </ul>
                      <p className="mt-2 text-yellow-400">💡 Tip: Leave prompt empty to use only active wildcards!</p>
                      <p className="mt-1 text-gray-500">
                        Active wildcards will append: <span className="text-purple-400">{activeWildcards.join(', ') || 'none'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Negative Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Negative Description</label>
                    <input
                      name="negative_description"
                      value={formData.negative_description}
                      onChange={handleInputChange}
                      placeholder="blurry, ugly, distorted"
                      className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Size */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Size</label>
                    
                    {formData.no_background ? (
                      <div className="space-y-2">
                        <p className="text-xs text-yellow-400 mb-2">
                          ⚠️ Transparent backgrounds limited to 128x128 or smaller
                        </p>
                        {Object.entries(sizePresets).flatMap(([category, sizes]) => 
                          sizes.filter(size => size.width <= 128 && size.height <= 128).map(option => (
                            <label
                              key={option.size}
                              className="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                            >
                              <input
                                type="radio"
                                name="imageSize"
                                checked={formData.width === option.width && formData.height === option.height}
                                onChange={() => handleSizeSelect(option.width, option.height)}
                                className="mr-3 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="font-medium">{option.size}</span>
                              <span className="ml-2 text-xs text-gray-400">({category})</span>
                            </label>
                          ))
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Object.keys(sizePresets).map(category => (
                            <button
                              key={category}
                              onClick={() => setSelectedCategory(category)}
                              className={`px-3 py-1 text-xs rounded ${
                                selectedCategory === category
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                        
                        <div className="space-y-2">
                          {sizePresets[selectedCategory]?.map(option => (
                            <label
                              key={option.size}
                              className="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                            >
                              <input
                                type="radio"
                                name="imageSize"
                                checked={formData.width === option.width && formData.height === option.height}
                                onChange={() => handleSizeSelect(option.width, option.height)}
                                className="mr-3 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="font-medium">{option.size}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Style Options */}
            <div className="bg-gray-800 rounded-lg">
              <button
                onClick={() => toggleSection('style')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors rounded-t-lg"
              >
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Style Options
                </h2>
                {expandedSections.style ? <ChevronUp /> : <ChevronDown />}
              </button>
              
              {expandedSections.style && (
                <div className="p-6 pt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Outline</label>
                      <select
                        name="outline"
                        value={formData.outline}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                      >
                        {outlineOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Shading</label>
                      <select
                        name="shading"
                        value={formData.shading}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                      >
                        {shadingOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Detail Level</label>
                    <select
                      name="detail"
                      value={formData.detail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    >
                      {detailOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Options */}
            <div className="bg-gray-800 rounded-lg">
              <button
                onClick={() => toggleSection('advanced')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors rounded-t-lg"
              >
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Advanced Options
                </h2>
                {expandedSections.advanced ? <ChevronUp /> : <ChevronDown />}
              </button>
              
              {expandedSections.advanced && (
                <div className="p-6 pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Guidance Scale ({formData.text_guidance_scale})
                    </label>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-2 bg-gray-700 rounded-lg overflow-hidden">
                          <div 
                            className="h-full bg-purple-600 rounded-lg transition-all duration-150"
                            style={{ width: `${((formData.text_guidance_scale - 1) / 19) * 100}%` }}
                          />
                        </div>
                      </div>
                      <input
                        type="range"
                        name="text_guidance_scale"
                        value={formData.text_guidance_scale}
                        onChange={handleInputChange}
                        min="1"
                        max="20"
                        step="0.5"
                        className="relative w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer slider z-10"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="no_background"
                      id="no_background"
                      checked={formData.no_background}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <label htmlFor="no_background" className="text-sm">
                      Generate without background
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Seed (optional)</label>
                    <input
                      type="number"
                      name="seed"
                      value={formData.seed}
                      onChange={handleInputChange}
                      placeholder="Random seed for reproducibility"
                      className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Wildcard Management */}
            <div className="bg-gray-800 rounded-lg">
              <button
                onClick={() => toggleSection('wildcards')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors rounded-t-lg"
              >
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  Wildcard Manager
                </h2>
                {expandedSections.wildcards ? <ChevronUp /> : <ChevronDown />}
              </button>
              
              {expandedSections.wildcards && (
                <div className="p-6 pt-4 space-y-4">
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-400">Active wildcards auto-append • Click names to add __wildcard__</p>
                        <p className="text-xs mt-1">
                          {serverConnected ? (
                            <span className="text-green-400 flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              Server connected - Wildcards saved as files
                            </span>
                          ) : (
                            <span className="text-yellow-400 flex items-center gap-1">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                              Using local storage - Start server for file storage
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowWildcardEditor(true);
                          setEditingWildcard(null);
                          setNewWildcardName('');
                          setNewWildcardContent('');
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        New Wildcard
                      </button>
                    </div>
                    
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-600">•</span>
                      <button
                        onClick={async () => {
                          const allKeys = Object.keys(wildcardFiles);
                          setActiveWildcards(allKeys);
                          try {
                            await wildcardAPI.updateActive(allKeys);
                          } catch (error) {
                            console.error('Failed to update active wildcards:', error);
                          }
                          setSuccessMessage(`Enabled all ${allKeys.length} wildcards`);
                        }}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        Enable All
                      </button>
                      <span className="text-gray-600">•</span>
                      <button
                        onClick={async () => {
                          setActiveWildcards([]);
                          try {
                            await wildcardAPI.updateActive([]);
                          } catch (error) {
                            console.error('Failed to update active wildcards:', error);
                          }
                          setSuccessMessage('Disabled all wildcards');
                        }}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        Disable All
                      </button>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">
                        {activeWildcards.length} of {Object.keys(wildcardFiles).length} active
                      </span>
                      <span className="text-gray-600">•</span>
                      <button
                        onClick={async () => {
                          try {
                            // Reload wildcards from server
                            const [wildcards, active] = await Promise.all([
                              wildcardAPI.getAll(),
                              wildcardAPI.getActive()
                            ]);
                            
                            setWildcardFiles(wildcards);
                            setActiveWildcards(active);
                            setServerConnected(true);
                            setSuccessMessage('Wildcards reloaded from server');
                          } catch (error) {
                            setServerConnected(false);
                            setError('Failed to reload wildcards: ' + error.message);
                          }
                        }}
                        className="text-green-400 hover:text-green-300"
                      >
                        Reload from Server
                      </button>
                    </div>
                  </div>

                  {/* Wildcard List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {Object.entries(wildcardFiles).map(([name, content]) => {
                      const lines = content.split('\n').filter(l => l.trim());
                      const isActive = activeWildcards.includes(name);
                      
                      return (
                        <div
                          key={name}
                          className={`p-3 bg-gray-700 rounded-lg border-2 transition-all ${
                            isActive ? 'border-purple-500 bg-gray-700/70' : 'border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="checkbox"
                                id={`wildcard-${name}`}
                                checked={isActive}
                                onChange={() => toggleWildcard(name)}
                                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 focus:ring-2"
                              />
                              <div className="flex-1">
                                <button 
                                  onClick={() => addWildcardPlaceholder(name)}
                                  className="text-left hover:text-purple-400 transition-colors"
                                >
                                  <h4 className="font-medium flex items-center gap-2">
                                    <span className={isActive ? 'text-purple-400' : 'text-gray-300'}>
                                      __{name}__
                                    </span>
                                    <span className="text-xs text-gray-400">({lines.length} items)</span>
                                    {isActive && (
                                      <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded">
                                        AUTO-APPEND
                                      </span>
                                    )}
                                  </h4>
                                </button>
                                <p className="text-xs text-gray-400 truncate max-w-xs">
                                  {lines.slice(0, 3).join(', ')}...
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => editWildcard(name)}
                                className="text-gray-400 hover:text-white p-1"
                                title="Edit wildcard"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteWildcard(name)}
                                className="text-gray-400 hover:text-red-400 p-1"
                                title="Delete wildcard"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Wildcard Editor Modal */}
                  {showWildcardEditor && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-700">
                          <h3 className="text-xl font-semibold">
                            {editingWildcard ? 'Edit Wildcard' : 'Create New Wildcard'}
                          </h3>
                        </div>
                        
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                          <div>
                            <label className="block text-sm font-medium mb-2">Wildcard Name</label>
                            <input
                              type="text"
                              value={newWildcardName}
                              onChange={(e) => setNewWildcardName(e.target.value)}
                              placeholder="e.g., fantasy_creatures"
                              className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                              disabled={editingWildcard !== null}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Use lowercase letters and underscores. Will be used as __wildcard_name__
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Wildcard Options (one per line)
                            </label>
                            <textarea
                              value={newWildcardContent}
                              onChange={(e) => setNewWildcardContent(e.target.value)}
                              placeholder="dragon&#10;unicorn&#10;phoenix&#10;griffin&#10;pegasus"
                              className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none font-mono text-sm"
                              rows="10"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Each line will be a possible value when the wildcard is used
                            </p>
                          </div>
                        </div>
                        
                        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                          <button
                            onClick={() => {
                              setShowWildcardEditor(false);
                              setEditingWildcard(null);
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveWildcard}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save Wildcard
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Batch Queue - IMPROVED STYLING */}
            <div className="bg-gray-800 rounded-lg">
              <button
                onClick={() => toggleSection('batch')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors rounded-t-lg"
              >
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <List className="w-5 h-5" />
                  Batch Queue ({queue.length} items)
                  {queueRunning && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
                </h2>
                {expandedSections.batch ? <ChevronUp /> : <ChevronDown />}
              </button>
              
              {expandedSections.batch && (
                <div className="p-6 pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Number of images to generate: {batchCount}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-2 bg-gray-700 rounded-lg overflow-hidden">
                          <div 
                            className="h-full bg-purple-600 rounded-lg transition-all duration-150"
                            style={{ width: `${(batchCount / 100) * 100}%` }}
                          />
                        </div>
                      </div>
                      <input
                        type="range"
                        value={batchCount}
                        onChange={(e) => setBatchCount(parseInt(e.target.value))}
                        min="1"
                        max="100"
                        className="relative w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer slider z-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Delay between requests: {batchDelay / 1000}s
                    </label>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-2 bg-gray-700 rounded-lg overflow-hidden">
                          <div 
                            className="h-full bg-purple-600 rounded-lg transition-all duration-150"
                            style={{ width: `${((batchDelay - 1000) / 9000) * 100}%` }}
                          />
                        </div>
                      </div>
                      <input
                        type="range"
                        value={batchDelay}
                        onChange={(e) => setBatchDelay(parseInt(e.target.value))}
                        min="1000"
                        max="10000"
                        step="500"
                        className="relative w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer slider z-10"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={addToQueue}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add {batchCount} to Queue
                    </button>
                    
                    {queueRunning ? (
                      <button
                        onClick={stopQueue}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Stop Queue
                      </button>
                    ) : (
                      <button
                        onClick={startQueue}
                        disabled={queue.filter(item => item.status === 'pending').length === 0}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start Queue
                      </button>
                    )}
                    
                    <button
                      onClick={clearQueue}
                      disabled={queue.length === 0}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 rounded-lg font-medium flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear All
                    </button>
                  </div>

                  {/* Enhanced Queue Display with Better Styling */}
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
                                  {item.seed && (
                                    <>
                                      <span className="text-xs text-gray-500">•</span>
                                      <span className="text-xs text-gray-500">
                                        Seed: {item.seed}
                                      </span>
                                    </>
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-200 line-clamp-2 break-words pr-2">
                                  {item.description}
                                </p>
                                
                                {item.error && (
                                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {item.error}
                                  </p>
                                )}
                                
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
                                className="flex-shrink-0 text-gray-500 hover:text-gray-300 p-1 rounded hover:bg-gray-700/50 transition-colors"
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
                  
                  {queue.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-gray-700/30 rounded-lg p-3">
                        <p className="text-2xl font-bold text-gray-300">{queue.filter(i => i.status === 'pending').length}</p>
                        <p className="text-xs text-gray-500">Pending</p>
                      </div>
                      <div className="bg-green-900/20 rounded-lg p-3">
                        <p className="text-2xl font-bold text-green-400">{queue.filter(i => i.status === 'completed').length}</p>
                        <p className="text-xs text-gray-500">Completed</p>
                      </div>
                      <div className="bg-red-900/20 rounded-lg p-3">
                        <p className="text-2xl font-bold text-red-400">{queue.filter(i => i.status === 'failed').length}</p>
                        <p className="text-xs text-gray-500">Failed</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Metadata Reader */}
            <div className="bg-gray-800 rounded-lg">
              <button
                onClick={() => toggleSection('metadata')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors rounded-t-lg"
              >
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Metadata Reader
                </h2>
                {expandedSections.metadata ? <ChevronUp /> : <ChevronDown />}
              </button>
              
              {expandedSections.metadata && (
                <div className="p-6 pt-4">
                  {/* Drag and Drop Zone */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      dragActive ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600 hover:border-gray-500'
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
                      <p className="text-sm text-gray-400 mb-4">or click to browse</p>
                      <p className="text-xs text-gray-500">
                        Drop any image generated by this tool to see its metadata
                      </p>
                    </label>
                  </div>

                  {/* Loading State */}
                  {metadataLoading && (
                    <div className="mt-4 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
                      <p className="text-sm text-gray-400 mt-2">Reading metadata...</p>
                    </div>
                  )}

                  {/* Extracted Metadata Display - FIXED FIELD NAMES */}
                  {extractedMetadata && !metadataLoading && (
                    <div className="mt-6 space-y-4">
                      {/* Image Preview */}
                      {extractedMetadata.imageUrl && (
                        <div className="bg-gray-900 rounded-lg p-4">
                          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <FileImage className="w-4 h-4" />
                            Image Preview
                          </h3>
                          <div className="flex justify-center">
                            <img
                              src={extractedMetadata.imageUrl}
                              alt="Metadata preview"
                              style={{
                                imageRendering: 'pixelated',
                                maxWidth: '200px',
                                maxHeight: '200px'
                              }}
                              className="border border-gray-700 rounded"
                            />
                          </div>
                        </div>
                      )}

                      {/* File Information */}
                      <div className="bg-gray-900 rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          File Information
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Filename:</span>
                            <span className="text-gray-300">{extractedMetadata.filename}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">File Size:</span>
                            <span className="text-gray-300">
                              {(extractedMetadata.fileSize / 1024).toFixed(2)} KB
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Dimensions:</span>
                            <span className="text-gray-300">
                              {extractedMetadata.width} × {extractedMetadata.height}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Prompts */}
                      {(extractedMetadata.prompt || extractedMetadata.originalPrompt) && (
                        <div className="bg-gray-900 rounded-lg p-4">
                          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Prompts
                          </h3>
                          {extractedMetadata.prompt && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-400 mb-1">Final Prompt:</p>
                              <p className="text-sm text-gray-300 break-words">{extractedMetadata.prompt}</p>
                            </div>
                          )}
                          {extractedMetadata.originalPrompt && extractedMetadata.originalPrompt !== extractedMetadata.prompt && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Original Template:</p>
                              <p className="text-sm text-gray-300 break-words">{extractedMetadata.originalPrompt}</p>
                            </div>
                          )}
                          {extractedMetadata.negativePrompt && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-400 mb-1">Negative Prompt:</p>
                              <p className="text-sm text-gray-300 break-words">{extractedMetadata.negativePrompt}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dynamic Selections */}
                      {extractedMetadata.selections && Array.isArray(extractedMetadata.selections) && extractedMetadata.selections.length > 0 && (
                        <div className="bg-gray-900 rounded-lg p-4">
                          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Wand2 className="w-4 h-4" />
                            Dynamic Selections
                          </h3>
                          <ul className="space-y-1">
                            {extractedMetadata.selections.map((sel, idx) => (
                              <li key={idx} className="text-xs text-gray-300">
                                <span className="text-gray-500">{sel.type === 'wildcard' ? '🎲' : '🔀'}</span>{' '}
                                <span className="text-purple-300">{sel.original}</span>{' '}
                                <span className="text-gray-500">→</span>{' '}
                                <span className="text-green-300">{sel.selected}</span>
                                {sel.placement && (
                                  <span className="text-gray-500 ml-2">({sel.placement})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Generation Settings */}
                      <div className="bg-gray-900 rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Sliders className="w-4 h-4" />
                          Generation Settings
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {extractedMetadata.outline && (
                            <div>
                              <span className="text-gray-400">Outline:</span>
                              <span className="ml-2 text-gray-300">{extractedMetadata.outline}</span>
                            </div>
                          )}
                          {extractedMetadata.shading && (
                            <div>
                              <span className="text-gray-400">Shading:</span>
                              <span className="ml-2 text-gray-300">{extractedMetadata.shading}</span>
                            </div>
                          )}
                          {extractedMetadata.detail && (
                            <div>
                              <span className="text-gray-400">Detail:</span>
                              <span className="ml-2 text-gray-300">{extractedMetadata.detail}</span>
                            </div>
                          )}
                          {extractedMetadata.guidanceScale && (
                            <div>
                              <span className="text-gray-400">Guidance Scale:</span>
                              <span className="ml-2 text-gray-300">{extractedMetadata.guidanceScale}</span>
                            </div>
                          )}
                          {extractedMetadata.noBackground && (
                            <div className="col-span-2">
                              <span className="text-gray-400">No Background:</span>
                              <span className="ml-2 text-gray-300">{extractedMetadata.noBackground}</span>
                            </div>
                          )}
                          {extractedMetadata.seed && extractedMetadata.seed !== '0' && (
                            <div className="col-span-2">
                              <span className="text-gray-400">Seed:</span>
                              <span className="ml-2 text-gray-300">{extractedMetadata.seed}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Settings (if present) */}
                      {extractedMetadata.settings && (
                        <div className="bg-gray-900 rounded-lg p-4">
                          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Full Settings
                          </h3>
                          <pre className="text-xs text-gray-300 overflow-x-auto">
                            {JSON.stringify(extractedMetadata.settings, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Timestamp and Generator Info */}
                      <div className="bg-gray-900 rounded-lg p-4">
                        <div className="space-y-2 text-sm">
                          {extractedMetadata.timestamp && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-400">Generated:</span>
                              <span className="text-gray-300">
                                {new Date(extractedMetadata.timestamp).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {extractedMetadata.generator && (
                            <div>
                              <span className="text-gray-400">Generator:</span>
                              <span className="ml-2 text-gray-300">{extractedMetadata.generator}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Clear button */}
                      <button
                        onClick={() => setExtractedMetadata(null)}
                        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                      >
                        Clear Metadata
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !apiKey}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Image className="w-5 h-5" />
                  Generate {batchCount} Image{batchCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>

          {/* Enhanced Image Viewer */}
          <div className="lg:col-span-1 space-y-4">
            {/* Image Viewer */}
            {generatedImages.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Image Viewer ({currentImageIndex + 1}/{generatedImages.length})
                  </h2>
                  <button
                    onClick={downloadAllAsZip}
                    disabled={loading}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-sm flex items-center gap-1"
                  >
                    <Package className="w-4 h-4" />
                    Download All
                  </button>
                </div>
                
                {currentImage && (
                  <>
                    {/* Image Display */}
                    <div className="bg-gray-900 rounded-lg p-4 mb-4">
                      <div 
                        className="relative flex items-center justify-center"
                        style={{ minHeight: '300px' }}
                      >
                        <img
                          src={currentImage.url}
                          alt="Generated pixel art"
                          style={{
                            imageRendering: 'pixelated',
                            maxWidth: '100%',
                            maxHeight: '400px',
                            width: 'auto',
                            height: 'auto'
                          }}
                        />
                        <div className="absolute top-2 right-2 bg-purple-600 text-xs px-2 py-1 rounded">
                          {currentImage.width}×{currentImage.height}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateImage('prev')}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                        title="Previous (← arrow)"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <div className="flex-1 mx-4">
                        <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-purple-600 h-full transition-all duration-300"
                            style={{ width: `${((currentImageIndex + 1) / generatedImages.length) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={() => navigateImage('next')}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                        title="Next (→ arrow)"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Enhanced Image Info */}
                    <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-2">
                      {/* Prompts Section */}
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <h3 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Prompts
                        </h3>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400 mb-1">Final Prompt:</p>
                                <p className="text-sm text-gray-300 break-words">
                                  {currentImage.prompt}
                                </p>
                              </div>
                              <button
                                onClick={() => copyPrompt(currentImage.prompt)}
                                className="text-gray-400 hover:text-white flex-shrink-0"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {currentImage.originalPrompt && currentImage.originalPrompt !== currentImage.prompt && (
                            <div className="pt-2 border-t border-gray-600">
                              <p className="text-xs text-gray-400 mb-1">Original Template:</p>
                              <p className="text-xs text-gray-500 break-words">
                                {currentImage.originalPrompt}
                              </p>
                            </div>
                          )}
                          
                          {currentImage.negative_description && (
                            <div className="pt-2 border-t border-gray-600">
                              <p className="text-xs text-gray-400 mb-1">Negative Prompt:</p>
                              <p className="text-xs text-gray-500 break-words">
                                {currentImage.negative_description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dynamic Selections */}
                      {currentImage.selections && currentImage.selections.length > 0 && (
                        <div className="bg-gray-700/50 rounded-lg p-3">
                          <h3 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                            <Wand2 className="w-4 h-4" />
                            Dynamic Selections
                          </h3>
                          <ul className="space-y-1">
                            {currentImage.selections.map((sel, idx) => (
                              <li key={idx} className="text-xs text-gray-300">
                                <span className="text-gray-500">{sel.type === 'wildcard' ? '🎲' : '🔀'}</span>{' '}
                                <span className="text-purple-300">{sel.original}</span>{' '}
                                <span className="text-gray-500">→</span>{' '}
                                <span className="text-green-300">{sel.selected}</span>
                                {sel.placement && (
                                  <span className="text-gray-500 ml-2">({sel.placement})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Settings Used */}
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <h3 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                          <Sliders className="w-4 h-4" />
                          Settings Used
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Size:</span>
                            <span className="ml-1 text-gray-300">{currentImage.width}×{currentImage.height}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Outline:</span>
                            <span className="ml-1 text-gray-300">{currentImage.outline}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Shading:</span>
                            <span className="ml-1 text-gray-300">{currentImage.shading}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Detail:</span>
                            <span className="ml-1 text-gray-300">{currentImage.detail}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Guidance:</span>
                            <span className="ml-1 text-gray-300">{currentImage.text_guidance_scale}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Background:</span>
                            <span className="ml-1 text-gray-300">{currentImage.no_background ? 'None' : 'Yes'}</span>
                          </div>
                          {currentImage.seed && (
                            <div className="col-span-2">
                              <span className="text-gray-400">Seed:</span>
                              <span className="ml-1 text-gray-300">{currentImage.seed}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">Generated:</span>
                          <span className="text-gray-300">
                            {new Date(currentImage.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => downloadImage(currentImage)}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Current
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Tips */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="font-medium mb-2 text-sm">How It Works:</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• <span className="text-green-300">Active wildcards auto-append</span> to every prompt</li>
                <li>• Add <span className="text-purple-300">{'{option1|option2}'}</span> for variations</li>
                <li>• Use <span className="text-purple-300">__wildcard__</span> for specific placement</li>
                <li>• Leave prompt empty to use only wildcards</li>
                <li>• Click wildcard names to add __wildcard__ placeholder</li>
                <li>• Wildcard order is randomized each time</li>
                <li>• All metadata is embedded in downloaded PNGs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #9333ea;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 0 1px #1f2937, 0 0 8px rgba(147, 51, 234, 0.5);
          transition: all 0.2s;
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #9333ea;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 0 1px #1f2937, 0 0 8px rgba(147, 51, 234, 0.5);
          transition: all 0.2s;
        }
        
        .slider:hover::-webkit-slider-thumb {
          background: #a855f7;
          box-shadow: 0 0 0 1px #1f2937, 0 0 12px rgba(168, 85, 247, 0.6);
        }
        
        .slider:hover::-moz-range-thumb {
          background: #a855f7;
          box-shadow: 0 0 0 1px #1f2937, 0 0 12px rgba(168, 85, 247, 0.6);
        }
        
        .slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px #1f2937, 0 0 0 5px rgba(147, 51, 234, 0.3);
        }
        
        .slider:focus::-moz-range-thumb {
          box-shadow: 0 0 0 3px #1f2937, 0 0 0 5px rgba(147, 51, 234, 0.3);
        }
        
        /* Custom scrollbar styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
          margin: 4px 0;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
        
        /* Firefox scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(147, 51, 234, 0.5) rgba(31, 41, 55, 0.5);
        }
        
        /* Default scrollbar styling for other elements */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(75, 85, 99, 0.3);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
        
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(147, 51, 234, 0.5) rgba(75, 85, 99, 0.3);
        }
        
        /* Animation for processing items */
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
        
        /* Line clamp utility */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}