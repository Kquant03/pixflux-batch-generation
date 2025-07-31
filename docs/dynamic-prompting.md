# 🎯 Dynamic Prompting

Dynamic prompting allows you to create templates that generate multiple variations from a single prompt. Combined with wildcards, this creates endless possibilities.

## 📝 Table of Contents

- [Syntax Overview](#syntax-overview)
- [Variation Syntax](#variation-syntax)
- [Wildcard Integration](#wildcard-integration)
- [Processing Logic](#processing-logic)
- [Selection Tracking](#selection-tracking)
- [Advanced Patterns](#advanced-patterns)
- [Code Implementation](#code-implementation)

## Syntax Overview

### Two Main Components

1. **Inline Variations**: `{option1|option2|option3}`
   - Direct choices within the prompt
   - Randomly selects one option

2. **Wildcard References**: `__wildcard_name__`
   - References external wildcard files
   - Replaced with random selection from file

### Combination Example
```
A {young|old|ancient} __fantasy_creatures__ in {pixel art|16-bit|8-bit} __styles__
```

Possible output:
```
A young dragon in pixel art anime style
```

## Variation Syntax

### Basic Structure
```
{option1|option2|option3}
```

### Examples

**Simple Variations**
```
A {red|blue|green} car
→ "A blue car"
```

**Multiple Variations**
```
A {small|large} {wooden|metal} {box|crate}
→ "A large metal box"
```

**Complex Descriptions**
```
A warrior with {a mighty sword|twin daggers|a magical staff}
→ "A warrior with twin daggers"
```

### Processing Code

```javascript
// Process variations: {option1|option2|option3}
const variationRegex = /\{([^}]+)\}/g;
processedPrompt = processedPrompt.replace(variationRegex, (match, options) => {
  const choices = options.split('|').map(s => s.trim());
  const selected = choices[Math.floor(Math.random() * choices.length)];
  
  // Track selection for transparency
  selections.push({
    type: 'variation',
    original: match,
    selected: selected
  });
  
  return selected;
});
```

## Wildcard Integration

### Manual Placement
Place wildcards exactly where you want them:

```
A dragon in __styles__ style, painted __artists__
```

### Auto-Append Active Wildcards
Active wildcards automatically append to every prompt:

```
Input: "A castle"
Active: [styles, lighting, quality]
Output: "A castle, gothic style, dramatic lighting, masterpiece"
```

### Mixed Usage
Combine both approaches:

```
Prompt: "A {brave|wise|mysterious} knight __moods__"
Active: [quality, lighting]
Output: "A brave knight nostalgic, ultra detailed, golden hour"
```

## Processing Logic

### Complete Processing Flow

```javascript
const processDynamicPrompt = (prompt) => {
  let processedPrompt = prompt;
  const selections = [];
  
  // Step 1: Process manual wildcard placements
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
  
  // Step 2: Process inline variations
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
  
  // Step 3: Append active wildcards in random order
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
  
  // Append with proper formatting
  if (appendedWildcards.length > 0) {
    if (processedPrompt.trim()) {
      processedPrompt = processedPrompt.trim() + ', ' + appendedWildcards.join(', ');
    } else {
      processedPrompt = appendedWildcards.join(', ');
    }
  }
  
  return { processedPrompt, selections };
};
```

### Processing Order

1. **Manual Wildcards** - Placed exactly where specified
2. **Inline Variations** - Processed left to right
3. **Auto-Append** - Added at the end in random order

## Selection Tracking

### Why Track Selections?

- **Transparency**: See exactly what was chosen
- **Reproducibility**: Understand successful combinations
- **Learning**: Identify patterns in good results
- **Debugging**: Troubleshoot unexpected outputs

### Selection Data Structure

```javascript
{
  type: 'wildcard',           // or 'variation'
  original: '__styles__',     // what was in the template
  selected: 'anime style',    // what was chosen
  wildcardName: 'styles',     // which wildcard (if applicable)
  placement: 'manual'         // or 'auto-appended'
}
```

### Display in UI

```javascript
// Show selections in image viewer
{currentImage.selections && currentImage.selections.length > 0 && (
  <div className="bg-gray-700/50 rounded-lg p-3">
    <h3 className="text-sm font-medium text-purple-400 mb-2">
      Dynamic Selections
    </h3>
    <ul className="space-y-1">
      {currentImage.selections.map((sel, idx) => (
        <li key={idx} className="text-xs text-gray-300">
          <span>{sel.type === 'wildcard' ? '🎲' : '🔀'}</span>
          <span className="text-purple-300">{sel.original}</span>
          <span className="text-gray-500">→</span>
          <span className="text-green-300">{sel.selected}</span>
          {sel.placement && (
            <span className="text-gray-500 ml-2">({sel.placement})</span>
          )}
        </li>
      ))}
    </ul>
  </div>
)}
```

## Advanced Patterns

### Nested Variations
```
A {brave {knight|paladin}|wise {mage|wizard}} 
```
*Note: Not currently supported, would require recursive processing*

### Weighted Options
```
A {common|common|common|rare} item
```
*Repeating options increases their probability*

### Empty Options
```
A dragon{| breathing fire| sleeping}
→ Could be: "A dragon" or "A dragon breathing fire"
```

### Conditional Wildcards
Use wildcards within variations:
```
{A cheerful|An ominous} __fantasy_creatures__
```

## Code Implementation

### Frontend Integration

```javascript
// Create queue items with variations
const createQueueItems = () => {
  const items = [];
  
  for (let i = 0; i < batchCount; i++) {
    // Each item gets unique processing
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

### Wildcard Helper

```javascript
const processWildcard = (match, wildcardName) => {
  const cleanName = wildcardName.trim();
  
  if (!wildcardFiles[cleanName]) {
    return match; // Return original if doesn't exist
  }
  
  const wildcardContent = wildcardFiles[cleanName];
  const options = wildcardContent.split('\n').filter(line => line.trim());
  
  if (options.length === 0) {
    return match;
  }
  
  const selected = options[Math.floor(Math.random() * options.length)].trim();
  return selected;
};
```

## Best Practices

### 1. Prompt Structure
- Keep base prompt simple
- Use variations for key changes
- Let wildcards handle style/quality

### 2. Variation Design
- Make options distinctly different
- Keep similar length for balance
- Test each option individually

### 3. Wildcard Placement
- Use manual placement for specific needs
- Let auto-append handle general enhancements
- Don't overload with too many wildcards

### 4. Testing Strategy
- Generate small batches first
- Review selections to understand results
- Refine based on what works

## Examples in Action

### Example 1: Character Portrait
```
Template: "A {young|middle-aged|elderly} {male|female} __fantasy_races__ {warrior|mage|rogue}"
Active: [styles, quality, lighting]

Result: "A young female elf with pointed ears mage, impressionist style, masterpiece, rim lighting"

Selections:
🔀 {young|middle-aged|elderly} → young
🔀 {male|female} → female
🎲 __fantasy_races__ → elf with pointed ears
🔀 {warrior|mage|rogue} → mage
🎲 __styles__ → impressionist style (auto-appended)
🎲 __quality__ → masterpiece (auto-appended)
🎲 __lighting__ → rim lighting (auto-appended)
```

### Example 2: Environment
```
Template: "A {haunted|enchanted|ancient} forest with {glowing mushrooms|twisted trees|magical fog}"
Active: [moods, colors]

Result: "A haunted forest with twisted trees, mysterious, muted colors"

Selections:
🔀 {haunted|enchanted|ancient} → haunted
🔀 {glowing mushrooms|twisted trees|magical fog} → twisted trees
🎲 __moods__ → mysterious (auto-appended)
🎲 __colors__ → muted colors (auto-appended)
```

---

Next: [Batch Queue](./batch-queue.md) - Learn about intelligent queue management