# 🎨 Pixflux Batch Generation

<img width="2560" height="1440" alt="Saber" src="https://github.com/user-attachments/assets/8239c3e1-54b8-488f-be21-611a014d15ef" />

## The Ultimate Pixel Art Generation Tool with Dynamic Prompts & Complete Transparency

### 🌟 What Is This?

This is a powerful web application that connects to PixelLab AI's API to generate pixel art. But it's not just any generator - it's designed to create **hundreds of unique variations** from a single prompt, with complete transparency about what variations were selected, intelligent queue management, and dynamic prompt generation.

Think of it as your pixel art factory with X-ray vision - you design the blueprint, it creates endless variations, and shows you exactly how each one was made.

---

## 📚 Table of Contents

1. [How To Run](#how-to-run)
2. [Core Concepts](#core-concepts)
3. [What's New](#whats-new)
4. [Getting Started](#getting-started)
5. [The Wildcard System](#the-wildcard-system)
6. [Dynamic Prompting](#dynamic-prompting)
7. [Batch Generation](#batch-generation)
8. [Advanced Features](#advanced-features)
9. [Tips & Tricks](#tips-tricks)
10. [Troubleshooting](#troubleshooting)

---
## How To Run
```
git clone https://github.com/Kquant03/pixflux-batch-generation

cd into /backend

npm install
npm run dev


cd into /src
npm install
npm run dev
```

## 🧠 Core Concepts

### What Makes This Special?

1. **Dynamic Prompts**: Write one prompt, generate infinite variations
2. **Selection Transparency**: See exactly which wildcards and variations were chosen
3. **Wildcard System**: Create reusable collections with click-to-add functionality
4. **Batch Queue**: Generate 1-100 images with smart rate limiting and visual feedback
5. **No Server Needed**: Runs entirely in your browser
6. **Persistent Storage**: Your wildcards and settings are saved locally

### Who Is This For?

- **Game Developers**: Need multiple character variations, items, or environments
- **Artists**: Want to explore different styles and combinations systematically
- **Content Creators**: Generate unique assets at scale with full control
- **Anyone**: Who loves pixel art and wants to understand their creative process!

---

## 🚀 What's New

### ✨ Latest Features

1. **Click-to-Append Wildcards**: Simply click any wildcard name to add it to your prompt
2. **Dynamic Selection Tracking**: See exactly what choices were made for each image
3. **Enhanced Queue Animations**: Visual feedback shows processing, completed, and failed states
4. **Improved UI Polish**: Better spacing, custom scrollbars, and smoother interactions
5. **Metadata Enhancement**: All dynamic selections are saved in exports

---

## 🚀 Getting Started

### Step 1: Get Your API Key
1. Visit [pixellab.ai](https://www.pixellab.ai)
2. Create an account
3. Find your API secret in the dashboard
4. Paste it in the app's API Secret Key field

### Step 2: Understanding the Interface

The app is divided into several collapsible sections:

- **Basic Settings**: Your prompt and image size
- **Style Options**: Outline, shading, and detail level
- **Advanced Options**: Fine-tuning parameters
- **Wildcard Manager**: Create and manage dynamic options (with click-to-add!)
- **Batch Queue**: Control bulk generation with visual status

### Step 3: Your First Image
1. Type a simple prompt: "a cute dragon"
2. Click "Generate 1 Image"
3. Watch your pixel art appear!
4. Check the "Dynamic selections" box to see what choices were made (if any)

---

## 🎲 The Wildcard System

### What Are Wildcards?

Wildcards are **collections of options** that can be randomly selected when generating images. Think of them as dice with many sides - each time you roll, you get a different result.

### 🆕 Click-to-Add Feature

The wildcard manager now supports **click-to-append** functionality:
- Click any wildcard name (like `__styles__`) to add it to your prompt
- It automatically adds proper comma separation
- The checkbox still controls whether the wildcard is active
- See instant feedback when wildcards are added

### How Wildcards Work

When you write `__artists__` in your prompt, the system:
1. Looks for a wildcard named "artists"
2. Randomly picks one option from that wildcard
3. Replaces `__artists__` with the selected option
4. **Shows you exactly what was selected in the image viewer**

### Pre-Installed Wildcards

The app comes with 6 example wildcards:

#### 🎨 `__artists__` (20 options)
```
by Zdislaw Beksinski
by Vincent Van Gogh
by Michelangelo
by Leonardo da Vinci
by Pablo Picasso
...and 15 more
```

#### 🖌️ `__styles__` (20 options)
```
anime style
surrealist style
expressionist style
impressionist style
cubist style
...and 15 more
```

#### 😊 `__moods__` (20 options)
```
cheerful
melancholic
mysterious
energetic
peaceful
...and 15 more
```

#### 💡 `__lighting__` (20 options)
```
soft lighting
dramatic lighting
rim lighting
backlit
golden hour
...and 15 more
```

#### 🎨 `__colors__` (20 options)
```
vibrant colors
muted colors
pastel colors
neon colors
monochrome
...and 15 more
```

#### ⭐ `__quality__` (20 options)
```
masterpiece
high quality
ultra detailed
professional
award winning
...and 15 more
```

### Creating Your Own Wildcards

1. Click "Wildcard Manager" to expand the section
2. Click "New Wildcard"
3. Give it a name (use lowercase and underscores)
4. Add options, one per line
5. Click "Save Wildcard"

#### Example: Creating a Fantasy Creatures Wildcard

Name: `fantasy_creatures`

Content:
```
dragon breathing fire
unicorn with rainbow mane
phoenix rising from ashes
griffin with golden feathers
pegasus flying through clouds
basilisk with deadly gaze
hydra with seven heads
chimera prowling
mermaid on a rock
centaur archer
```

Now you can:
- Use `__fantasy_creatures__` in any prompt
- Click the wildcard name to append it instantly
- See which creature was selected in the image viewer

### Managing Wildcards

- **Enable/Disable**: Click the checkbox to activate/deactivate
- **Click to Add**: Click the wildcard name to append to prompt
- **Edit**: Click the pencil icon to modify
- **Delete**: Click the trash icon to remove
- **Bulk Actions**: "Enable All" or "Disable All"
- **Visual Status**: Active wildcards show a purple "ACTIVE" badge

---

## 🎯 Dynamic Prompting

<img width="879" height="358" alt="image" src="https://github.com/user-attachments/assets/c1139dc4-7740-4997-8188-8d16cfb0f139" />

### Syntax Options

#### 1. Inline Variations: `{option1|option2|option3}`

Example:
```
A {cute|fierce|mystical} dragon in a {forest|castle|cave}
```

Possible outputs:
- "A cute dragon in a forest"
- "A fierce dragon in a castle"  
- "A mystical dragon in a cave"
- (and 6 other combinations!)

#### 2. Wildcards: `__wildcard_name__`

Example:
```
A dragon painted __styles__, __artists__, with __lighting__
```

Possible output:
- "A dragon painted anime style, by Vincent Van Gogh, with golden hour"

#### 3. Combining Both

Example:
```
A {baby|adult|ancient} __fantasy_creatures__ in {pixel art|16-bit|8-bit} __styles__, __moods__ atmosphere, __quality__
```

This can generate thousands of unique combinations!

### 🆕 Selection Transparency

After generation, the image viewer shows:
- **Original prompt**: What you typed
- **Final prompt**: What was actually sent to the API
- **Dynamic selections**: A breakdown showing:
  - 🎲 Wildcard selections (e.g., `__styles__` → `anime style`)
  - 🔀 Variation selections (e.g., `{cute|scary}` → `cute`)

This complete transparency helps you:
- Understand what worked well
- Recreate successful combinations
- Debug unexpected results
- Learn which wildcards produce the best results

---

## 📦 Batch Generation

<img width="915" height="750" alt="image" src="https://github.com/user-attachments/assets/f1de999f-52bc-4318-bfe0-9ec41cd1860f" />

### Understanding the Queue System

The batch system lets you generate multiple images without hitting rate limits:

1. **Set Batch Count**: Use the slider (1-100 images)
2. **Set Delay**: Time between each generation (1-10 seconds)
3. **Click Add to Queue**: Adds variations to the queue
4. **Start Queue**: Begins processing

### 🆕 Enhanced Visual Feedback

Queue items now show clear status indicators:
- **Pending**: Normal appearance, waiting to process
- **Processing**: Purple ring with pulse animation
- **Completed**: Green checkmark, slightly faded
- **Failed**: Red alert icon, more faded

The improved animations make it easy to track progress at a glance!

### How It Works

1. Each image in the batch gets a unique variation (if using dynamic prompts)
2. Images are generated one at a time with your specified delay
3. **Every selection is tracked and displayed** in the image viewer
4. You can pause/resume anytime
5. Failed images show error messages
6. All images are saved to the gallery with full metadata

### Rate Limit Strategy

PixelLab has rate limits based on your subscription tier. The delay system helps you stay within limits:

- **Free Tier**: Use 3-5 second delays
- **Paid Tiers**: Can use 1-2 second delays
- **Large Batches**: Consider longer delays to be safe

---

## 🛠️ Advanced Features

### 1. Seed Control

Seeds make your generations reproducible:
- Same seed + same prompt = same image
- Leave blank for random seeds
- Batch generation increments seeds automatically

### 2. Transparent Backgrounds

- Enable "Generate without background"
- Limited to 128x128 or smaller
- Perfect for game sprites

### 3. Style Controls

Fine-tune your pixel art style:
- **Outline**: From thick black to no outline
- **Shading**: Flat to highly detailed
- **Detail Level**: Low, medium, or high

### 4. Gallery Features

- **Navigation**: Use ← → arrow keys or buttons
- **Progress Bar**: Visual indicator of current position
- **Prompt Display**: Shows processed prompt
- **Original Template**: Shows what you typed
- **🆕 Selection Breakdown**: Shows all dynamic choices made
- **Quick Actions**: Copy prompt, download image
- **Bulk Download**: Export all as ZIP with metadata

### 5. Test Tools

- **Test Dynamic Prompt**: Preview what your prompt will generate
- **Quick Wildcard Test**: Click to see a wildcard in action
- **Selection Display**: See choices in success messages

---

## 💡 Tips & Tricks

### For Best Results

1. **Start Simple**: Test with single images before batching
2. **Click Wildcards**: Use the new click-to-add feature for faster prompt building
3. **Check Selections**: Review what was selected to understand results
4. **Mix Specific + Random**: "A red dragon __styles__" gives controlled variety
5. **Layer Wildcards**: Multiple wildcards = exponential variations
6. **Save Good Prompts**: Copy successful prompts for future use

### Power User Tips

1. **Selection Analysis**: Study which wildcard combinations work best together
2. **Mega Wildcards**: Create wildcards with 100+ options for maximum variety
3. **Style Collections**: Save entire prompt templates as wildcards
4. **Batch Testing**: Generate 20-30 variations, analyze selections, refine
5. **Seed Surfing**: Find a good seed, check its selections, iterate

### UI Shortcuts

- **Quick Add**: Click wildcard names to append
- **Arrow Keys**: Navigate images in gallery
- **Hover Effects**: UI elements respond to mouse
- **Visual Status**: Active wildcards, processing items clearly marked

---

## 🔧 Troubleshooting

### Common Issues

**"API Error 429"**
- You're hitting rate limits
- Increase delay between requests
- Check your PixelLab subscription

**"Wildcard not appearing"**
- Check if wildcard is active (checkbox)
- Verify wildcard name matches exactly
- Look at selection breakdown to see what happened

**"Images Look Different Than Expected"**
- Check the selection breakdown in image viewer
- Verify which wildcards are active
- Some wildcards might have unexpected options

**"Can't see scrollbar content"**
- Scrollbars now have padding to prevent overlap
- Custom purple-themed scrollbars match the UI

### Best Practices

1. **Monitor Selections**: Always check what was selected
2. **Backup Wildcards**: Copy important ones to text files
3. **Test First**: Try single generations before big batches
4. **Clean Gallery**: Download good images to free up memory
5. **Use Click-to-Add**: Faster than typing wildcard names

---

## 🎨 Creative Challenges

Try these to master the system:

### Challenge 1: The Style Explorer
Create 25 versions of the same character in different art styles, then analyze which style wildcards work best

### Challenge 2: The Mood Matrix
Generate a creature showing 10 different emotions, study the mood selections

### Challenge 3: The Perfect Combo
Find the best wildcard combination by analyzing 50 generations and their selections

### Challenge 4: The Surprise Me
Use all wildcards in one prompt, see what unexpected combinations emerge

---

## 📝 Example Workflows

### Workflow 1: Game Item Generation with Transparency

1. Create item wildcard:
```
sword
shield  
potion
scroll
gem
```

2. Create rarity wildcard:
```
common wooden
rare silver
epic golden
legendary crystal
mythic divine
```

3. Use prompt:
```
__quality__ pixel art icon of a __rarities__ __item_types__, __styles__, game asset, __colors__
```

4. Generate batch and analyze:
- Check which style + rarity combinations look best
- Note successful color + item pairings
- Export favorites with selection data

### Workflow 2: Character Development

1. Base prompt:
```
{male|female} {warrior|mage|rogue} character sprite, __styles__, __artists__, __moods__ expression, __quality__
```

2. Generate 30 variations
3. Review selection breakdown for each
4. Identify winning combinations
5. Create targeted wildcards based on results

---

## 🚀 Final Words

This enhanced version gives you not just variety, but **understanding**. Every image comes with a complete record of how it was created, making it easier to:

- Reproduce successes
- Avoid failures  
- Learn what works
- Build better wildcards
- Create with confidence

The new click-to-add wildcards and selection tracking transform this from a random generator into a **precision creative tool**.

Your next masterpiece is just one click away - and now you'll know exactly how you made it!

---

## 📌 Quick Reference

### Syntax Cheatsheet
- `{option1|option2}` - Random choice
- `__wildcard__` - Use wildcard (if active)
- Click wildcard names to append
- Combine both for maximum variety

### Visual Indicators
- 🎲 = Wildcard selection
- 🔀 = Variation selection  
- Purple badge = Active wildcard
- Pulse animation = Processing
- Custom scrollbars = Better visibility

### Keyboard Shortcuts
- ← → Arrow keys: Navigate images

### Storage Locations
- Wildcards: Browser localStorage
- Images: Browser memory (download to save)
- Settings: Not persistent (yet)

Happy generating! 🎨✨ Now with complete transparency! 🔍
