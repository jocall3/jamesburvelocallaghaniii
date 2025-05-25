

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse, Chat, Part } from '@google/genai';
import { marked } from 'marked';

const GEMINI_API_KEY = process.env.API_KEY;

// --- Core Thematic Constants ---
const BOOK_TITLE_BASE = "O'Callaghan's Quantum Ascent: A Chronicle of Mastery";
const PROTAGONIST_NAME = "James Burvell O'Callaghan III";

const STUDY_TOPICS_LIST = [
  "AI-Driven Quantum Banking & Finance",
  "Neural Networks for Predictive Macroeconomics & Algorithmic Sovereignty",
  "Quantum-Resistant Ledger Technologies & Decentralized Autonomous Organizations (DAOs)",
  "Computational Metaphysics in High-Frequency Trading",
  "Bio-Integrated Financial Interfaces & Cognitive Augmentation for Strategists",
  "Psychohistorical Analysis of Market Sentiment & Behavioral Economics",
  "Ethical Frameworks for Post-Singularity Economies & AI Governance",
  "Simulated Realities for Economic Modeling & Complex System Dynamics",
  "Exotic Energy Arbitrage (e.g., Zero-Point Energy, Gravitational Waves)",
  "Temporal Mechanics and Non-Linear Dynamics in Financial Forecasting",
  "Genetic Algorithms & Evolutionary Strategies for Portfolio Optimization",
  "Advanced Cryptography (e.g., Homomorphic Encryption, Cosmic Background Radiation Keys)",
  "Information Theory & The Fundamental Limits of Financial Predictability",
  "Neuro-Linguistic Programming & Memetics for Market Influence (Ethical Considerations)",
  "The Philosophy of Value in Post-Scarcity & Transhuman Economies",
  "Aesthetic Computation: Generating Novel Financial Instruments as Emergent Art Forms",
  "Dream-State Incubation & Intuitive Oracles for Strategic Insight",
  "Exo-Planetary Resource Allocation & Interstellar Investment Models",
  "The Emergence of Sentient Financial Networks & Digital Consciousness",
  "Harnessing Quantum Entanglement for Secure, Instantaneous Global Transactions",
  "Developing AI Tutors for Accelerated Mastery of Complex Domains",
  "Founding Institutes for Advanced Interdisciplinary Research",
  "Philosophical Implications of Technological Immortality on Economic Systems"
];

const CORE_THEMES_AND_TOPICS_DESCRIPTION = `The narrative follows ${PROTAGONIST_NAME} on his epic intellectual journey to explore, understand, and ultimately master a vast array of interconnected advanced fields. This chronicle, "${BOOK_TITLE_BASE}", details his deep dives into subjects such as: ${STUDY_TOPICS_LIST.join(', ')}.
The story focuses on his process of discovery, the challenges of pioneering new knowledge, the ethical dilemmas encountered, his breakthroughs, and the application of his rapidly expanding expertise. ${PROTAGONIST_NAME}'s endeavors often involve founding new research initiatives, collaborating with (or outpacing) global experts, and grappling with the profound societal and philosophical implications of his work. He operates largely through his own driven initiatives and the intellectual ecosystems he cultivates, rather than being tied to a single conventional entity. The narrative is one of continuous learning, innovation, and the unfolding of ${PROTAGONIST_NAME}'s extraordinary intellect as he reshapes humanity's understanding of reality, finance, and consciousness.`;

const PRIMARY_ENTITY_CONTEXT = `his personal research initiatives, the institutes he founds (e.g., "The O'Callaghan Institute for Advanced Cognition"), or the global network of collaborators and advanced projects he engages with. He is not bound by a single traditional organization.`;

const NUM_CHOICES_TO_GENERATE = 20;
const LOCAL_STORAGE_KEY = 'interactiveStory_OCallaghanAscent_v1';
const ACTIVE_TAB_KEY = 'interactiveStory_OCallaghanAscent_activeTab_v1';

let ai: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
} else {
  console.error("API_KEY environment variable not found. AI features will be disabled.");
}

// --- UI Elements ---
let appContainer: HTMLElement;
let leftPanel: HTMLElement;
let bookTitleDisplay: HTMLElement;

// Tab Elements
let tabChronicle: HTMLButtonElement;
let tabChat: HTMLButtonElement;
let panelChronicle: HTMLElement;
let panelChat: HTMLElement;
let tabButtons: HTMLButtonElement[];
let tabPanels: HTMLElement[];

// Chronicle Tab Panel Elements
let statusArea: HTMLElement;
let choicesArea: HTMLElement;
let choicesLabel: HTMLElement;
let actionButton: HTMLButtonElement;
let downloadStoryButton: HTMLButtonElement;
let downloadStoryTextButton: HTMLButtonElement;

// Chat Tab Panel Elements (Oracle Chat)
let chatModule: HTMLElement;
let chatHistoryDisplay: HTMLElement;
let chatInput: HTMLTextAreaElement;
let chatSendButton: HTMLButtonElement;

// Story Display Panel Elements (Right Side)
let storyDisplayPanel: HTMLElement;
let storyContentElement: HTMLElement;


// --- State Variables ---
type StorySectionType = 'genesis' | 'study_phase' | 'breakthrough' | 'challenge' | 'application';
type StorySection = {
  id: string;
  type: StorySectionType;
  title: string;
  htmlContent: string;
  rawTextContent?: string; // For TTS and text export
  imageUrl?: string;
  imagePrompt?: string;
  choices?: { text: string; consequenceContext: string }[];
  topicFocus?: string; // Specific topic from STUDY_TOPICS_LIST
};

type ChatMessage = {
  role: 'user' | 'ai' | 'system';
  text: string;
};

let currentStory: StorySection[] = [];
let isGenerating = false; // Global flag for any AI operation
let storyContext = ""; // Accumulates context for the AI
let currentChapterNumber = 0;
let currentSectionType: StorySectionType = 'genesis';
let chatMessages: ChatMessage[] = [];
let geminiChat: Chat | null = null;

// TTS State
let currentSpeakingSectionId: string | null = null;
let currentThematicNarratingSectionId: string | null = null;
let audioInstances: { [key: string]: SpeechSynthesisUtterance } = {};
let currentSpokenUtterance: SpeechSynthesisUtterance | null = null;


// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
  if (!GEMINI_API_KEY) {
    showMissingApiKeyWarning();
  }
  initializeUIElements();
  initializeTabs();
  loadSavedStory(); // Loads story and potentially active tab
  initializeChat();
  updateButtonAndChoiceUI(); // Initial UI state update

  if (currentStory.length === 0 && GEMINI_API_KEY) {
    generateGenesisChapter();
  } else if (currentStory.length > 0) {
    renderFullStory(); // Render loaded story
  } else {
    storyContentElement.innerHTML = `<p class="placeholder-text">The chronicle of O'Callaghan's Quantum Ascent awaits your guidance... API Key might be missing.</p>`;
  }
}

function showMissingApiKeyWarning() {
  const body = document.querySelector('body');
  if (body) {
    const warningDiv = document.createElement('div');
    warningDiv.textContent = "Gemini API Key is missing. AI functionalities will be disabled. Please set the API_KEY environment variable.";
    warningDiv.style.backgroundColor = "red";
    warningDiv.style.color = "white";
    warningDiv.style.padding = "10px";
    warningDiv.style.textAlign = "center";
    warningDiv.style.position = "fixed";
    warningDiv.style.top = "0";
    warningDiv.style.left = "0";
    warningDiv.style.width = "100%";
    warningDiv.style.zIndex = "10000";
    body.prepend(warningDiv);
  }
   if (statusArea) updateStatus("Error: Gemini API Key is missing. AI features are disabled.", true);
}


function initializeUIElements() {
  appContainer = document.getElementById('app-container')!;
  leftPanel = document.getElementById('left-panel')!;
  bookTitleDisplay = document.getElementById('book-title-display')!;
  bookTitleDisplay.textContent = BOOK_TITLE_BASE;

  // Tabs
  tabChronicle = document.getElementById('tab-chronicle') as HTMLButtonElement;
  tabChat = document.getElementById('tab-chat') as HTMLButtonElement;
  panelChronicle = document.getElementById('panel-chronicle')!;
  panelChat = document.getElementById('panel-chat')!;
  tabButtons = [tabChronicle, tabChat];
  tabPanels = [panelChronicle, panelChat];

  // Chronicle Panel
  statusArea = document.getElementById('status-area')!;
  choicesArea = document.getElementById('choices-area')!;
  choicesLabel = document.getElementById('choices-label')!;
  actionButton = document.getElementById('action-button') as HTMLButtonElement;
  downloadStoryButton = document.getElementById('download-story-button') as HTMLButtonElement;
  downloadStoryTextButton = document.getElementById('download-story-text-button') as HTMLButtonElement;

  // Chat Panel
  chatModule = document.getElementById('chat-module')!;
  chatHistoryDisplay = document.getElementById('chat-history')!;
  chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
  chatSendButton = document.getElementById('chat-send-button') as HTMLButtonElement;

  // Story Display
  storyDisplayPanel = document.getElementById('story-display-panel')!;
  storyContentElement = document.getElementById('story-content')!;

  // Event Listeners for buttons
  actionButton.addEventListener('click', handleStartNewStory);
  downloadStoryButton.addEventListener('click', downloadStoryAsHTML);
  downloadStoryTextButton.addEventListener('click', downloadStoryAsText);
  chatSendButton.addEventListener('click', handleChatSend);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  });
}

// --- Tab Logic ---
function initializeTabs() {
  tabButtons.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.id));
  });

  const savedTabId = localStorage.getItem(ACTIVE_TAB_KEY);
  if (savedTabId && tabButtons.find(t => t.id === savedTabId)) {
    switchTab(savedTabId);
  } else {
    switchTab(tabChronicle.id); // Default to chronicle tab
  }
}

function switchTab(targetTabId: string) {
  tabButtons.forEach(tab => {
    const isSelected = tab.id === targetTabId;
    tab.setAttribute('aria-selected', String(isSelected));
  });
  tabPanels.forEach(panel => {
    if (panel.getAttribute('aria-labelledby') === targetTabId) {
      panel.classList.remove('tab-panel-hidden');
    } else {
      panel.classList.add('tab-panel-hidden');
    }
  });
  localStorage.setItem(ACTIVE_TAB_KEY, targetTabId);
}

// --- Story Persistence ---
function saveStory() {
  try {
    const storyState = {
      currentStory,
      storyContext,
      currentChapterNumber,
      currentSectionType,
      chatMessages
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storyState));
  } catch (error) {
    console.error("Error saving story to localStorage:", error);
    updateStatus("Error: Could not save progress. Your browser's storage might be full or disabled.", true);
  }
}

function loadSavedStory() {
  const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedState) {
    try {
      const restoredState = JSON.parse(savedState);
      currentStory = restoredState.currentStory || [];
      storyContext = restoredState.storyContext || "";
      currentChapterNumber = restoredState.currentChapterNumber || 0;
      currentSectionType = restoredState.currentSectionType || 'genesis';
      chatMessages = restoredState.chatMessages || [];

      if (currentStory.length > 0) {
        storyContentElement.innerHTML = ''; // Clear placeholder
        renderFullStory();
        updateStatus("Welcome back! Your chronicle has been restored.", false);
      }
      if (chatMessages.length > 0) {
        renderChatHistory();
      }
    } catch (error) {
      console.error("Error loading story from localStorage:", error);
      updateStatus("Error: Could not restore saved progress. Starting fresh.", true);
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
      currentStory = []; // Reset state
      chatMessages = [];
    }
  }
}

function renderFullStory() {
  storyContentElement.innerHTML = ''; // Clear existing content
  currentStory.forEach(section => displayStorySection(section, false)); // false = don't animate
  updateButtonAndChoiceUI();
  // Scroll to the latest section if desired, e.g.:
  // if (storyContentElement.lastElementChild) {
  //   storyContentElement.lastElementChild.scrollIntoView({ behavior: 'smooth' });
  // }
}


// --- Story Generation ---
async function handleStartNewStory() {
  if (isGenerating) return;

  const confirmation = confirm("Are you sure you want to restart O'Callaghan's Ascent? All current progress will be lost.");
  if (!confirmation) return;

  stopAllNarration();
  isGenerating = true; // Set generating true BEFORE clearing, to disable buttons
  updateButtonAndChoiceUI(); // Reflect generating state

  currentStory = [];
  storyContext = "";
  currentChapterNumber = 0;
  currentSectionType = 'genesis';
  chatMessages = [];
  storyContentElement.innerHTML = `<p class="placeholder-text">Initiating a new chronicle...</p>`;
  choicesArea.innerHTML = '';
  choicesLabel.classList.add('choices-label-hidden');
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  renderChatHistory(); // Clear chat display
  
  if (GEMINI_API_KEY) {
    await generateGenesisChapter();
  } else {
     updateStatus("Cannot start new story: API Key is missing.", true);
     isGenerating = false; // Reset if not actually generating
     updateButtonAndChoiceUI();
  }
}

async function generateGenesisChapter() {
  if (!ai) {
    isGenerating = false; // Ensure flag is reset if AI is not available
    updateButtonAndChoiceUI();
    return;
  }
  isGenerating = true; // Ensure it's true for this operation
  updateButtonAndChoiceUI(); // Update UI to reflect loading state

  currentChapterNumber = 1;
  currentSectionType = 'genesis';
  updateStatus(`Chapter ${currentChapterNumber}: The Spark of Inquiry - Crafting the genesis of O'Callaghan's intellectual odyssey...`, false);

  const prompt = `
    You are a master storyteller, beginning the epic chronicle titled "${BOOK_TITLE_BASE}".
    The protagonist is ${PROTAGONIST_NAME}.
    The overarching theme is ${PROTAGONIST_NAME}'s intellectual journey to master a vast array of advanced fields: ${CORE_THEMES_AND_TOPICS_DESCRIPTION}.
    His work involves ${PRIMARY_ENTITY_CONTEXT}.

    Write the genesis chapter (approx 200-300 words). This first chapter should introduce ${PROTAGONIST_NAME} and set the stage for his monumental quest for knowledge. It should hint at the extraordinary breadth of his ambition and the nature of his unique approach to learning and innovation.
    Conclude this genesis chapter by subtly foreshadowing the first major area of study he will delve into from the list of topics.
    Do not offer choices yet. This is the introductory chapter.
    The tone should be grand, intellectual, and slightly mysterious.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: { temperature: 0.7, topP: 0.95, topK: 40 }
    });

    const text = response.text;
    const newSection: StorySection = {
      id: `chapter-${currentChapterNumber}-genesis`,
      type: 'genesis',
      title: `Chapter ${currentChapterNumber}: The Spark of Inquiry`,
      htmlContent: marked.parse(text) as string,
      rawTextContent: text,
    };
    currentStory.push(newSection);
    storyContext += `Chapter ${currentChapterNumber} Summary: ${text}\n\n`;
    displayStorySection(newSection);
    await generateChoicesForNextStep(newSection);
  } catch (error) {
    console.error("Error generating genesis chapter:", error);
    updateStatus("Error: Could not begin the chronicle. An issue occurred with the AI.", true);
  } finally {
    isGenerating = false;
    updateButtonAndChoiceUI();
    saveStory();
  }
}

async function generateChoicesForNextStep(currentSection: StorySection) {
  if (!ai) return;
  // This function is now called by a parent that manages isGenerating and updateButtonAndChoiceUI.
  // It should focus on fetching and rendering choices or error states.

  updateStatus(`Identifying potential paths for ${PROTAGONIST_NAME} following "${currentSection.title}"...`, false);

  const exploredTopics = currentStory.map(s => s.topicFocus).filter(Boolean);
  const availableTopics = STUDY_TOPICS_LIST.filter(t => !exploredTopics.includes(t));
  const topicsForChoices = availableTopics.sort(() => 0.5 - Math.random()).slice(0, NUM_CHOICES_TO_GENERATE + 1);

  const prompt = `
    Based on the chronicle so far, particularly the last section:
    "${currentSection.rawTextContent}"

    And considering the overall themes: ${CORE_THEMES_AND_TOPICS_DESCRIPTION}.
    ${PROTAGONIST_NAME} is now poised to embark on a new phase of study or apply his knowledge.
    Suggest ${NUM_CHOICES_TO_GENERATE} distinct and compelling choices for his next significant endeavor. Each choice should clearly relate to one of the following potential areas, or a synthesis of them: ${topicsForChoices.join(', ')}.
    
    For each choice, provide:
    1. A short, evocative text for the choice button (max 15 words).
    2. A brief consequenceContext (1-2 sentences) describing what focusing on this choice would entail for ${PROTAGONIST_NAME}, hinting at the intellectual challenges or potential breakthroughs.

    Format the response as a JSON array of objects, where each object has "text" and "consequenceContext" keys. Example:
    [
      {"text": "Delve into Quantum Entanglement", "consequenceContext": "He would explore the fundamental nature of entanglement, seeking to harness it for unbreakable communication."},
      {"text": "Pioneer AI-Driven Banking", "consequenceContext": "O'Callaghan would design novel AI systems to revolutionize financial transactions and risk assessment."}
    ]
    Ensure the JSON is valid. Only provide the JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.8 }
    });
    
    const jsonResponse = parseJsonResponse(response.text);
    if (jsonResponse && Array.isArray(jsonResponse)) {
      currentSection.choices = jsonResponse.slice(0, NUM_CHOICES_TO_GENERATE);
      if (currentSection.choices.length > 0) {
        renderChoices(currentSection.choices);
        updateStatus(`Chapter ${currentChapterNumber} concluded. Choose ${PROTAGONIST_NAME}'s next focus.`, false);
      } else {
        // AI returned empty array, or filtering resulted in no choices.
        updateStatus(`The paths are momentarily unclear for "${currentSection.title}".`, false);
        choicesArea.innerHTML = `<p class='info-text'>The Oracle reflects... No distinct new paths for O'Callaghan crystallize from this juncture. You might try consulting the Oracle Chat or restarting the Ascent if truly blocked.</p>`;
        choicesLabel.classList.add('choices-label-hidden');
      }
    } else {
      throw new Error("Invalid JSON response for choices. AI might have returned non-array or unparseable content.");
    }
  } catch (error) {
    console.error("Error generating choices:", error);
    updateStatus("Error: Could not determine next steps. AI is having trouble with choices.", true);
    choicesArea.innerHTML = `<p class='error-text'>The AI failed to generate further paths. The chronicle pauses here. You may need to restart or consult the Oracle Chat for insights.</p>`;
    choicesLabel.classList.add('choices-label-hidden'); // Ensure label is hidden on error
  }
  // The parent function's 'finally' block will handle:
  // isGenerating = false;
  // updateButtonAndChoiceUI();
  // saveStory(); 
}


async function handleChoiceClick(choice: { text: string; consequenceContext: string }) {
  if (isGenerating || !ai) return;
  isGenerating = true;
  currentChapterNumber++;
  currentSectionType = 'study_phase'; 
  
  updateButtonAndChoiceUI(); // Disable buttons, update status if choicesArea was cleared before this
  choicesArea.innerHTML = ''; // Clear old choices
  choicesLabel.classList.add('choices-label-hidden'); // Hide label while loading
  updateStatus(`Chapter ${currentChapterNumber}: ${choice.text} - Chronicling O'Callaghan's pursuit of knowledge...`, false);


  storyContext += `Decision: ${PROTAGONIST_NAME} chose to pursue: "${choice.text}". This entails: ${choice.consequenceContext}\n\n`;
  const chosenTopicGuess = STUDY_TOPICS_LIST.find(topic => 
    choice.text.toLowerCase().includes(topic.split(" ")[0].toLowerCase()) || 
    choice.consequenceContext.toLowerCase().includes(topic.split(" ")[0].toLowerCase()) ||
    topic.toLowerCase().includes(choice.text.toLowerCase().substring(0, Math.max(5, choice.text.length / 2) )) // More robust matching
  );


  const prompt = `
    Continuing "${BOOK_TITLE_BASE}":
    Protagonist: ${PROTAGONIST_NAME}
    Overall Themes: ${CORE_THEMES_AND_TOPICS_DESCRIPTION}
    Context of his work: ${PRIMARY_ENTITY_CONTEXT}
    Previous Story Context: ${currentStory.slice(-3).map(s => s.rawTextContent).join("\n\n")}
    
    ${PROTAGONIST_NAME} has just chosen to: "${choice.text}".
    The expected focus is: "${choice.consequenceContext}".
    The relevant study topic is likely: "${chosenTopicGuess || 'a synthesis of related advanced topics'}".

    Write the next story section (Chapter ${currentChapterNumber}, approx 250-350 words). This section should detail:
    - ${PROTAGONIST_NAME}'s initial approach to this new area of study or application.
    - Key concepts he grapples with or early experiments he conducts.
    - A significant insight, a notable challenge, or a minor breakthrough he experiences.
    - Weave in specific details related to the chosen topic.
    Maintain an intellectual, engaging, and slightly grand tone.
    
    Conclude this section naturally, setting a clear stage for the AI to generate the next set of choices (e.g., what specific problem to tackle next within this domain, or whether to synthesize this knowledge with another field).
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt, 
        config: { temperature: 0.75, topP: 0.95, topK: 50 }
    });

    const text = response.text;
    const newSection: StorySection = {
      id: `chapter-${currentChapterNumber}-${Date.now()}`,
      type: currentSectionType,
      title: `Chapter ${currentChapterNumber}: ${choice.text}`,
      htmlContent: marked.parse(text) as string,
      rawTextContent: text,
      topicFocus: chosenTopicGuess
    };
    currentStory.push(newSection);
    storyContext += `Chapter ${currentChapterNumber} ("${newSection.title}") Summary: ${text}\n\n`;
    
    displayStorySection(newSection);
    // These are awaited, ensuring they complete before the 'finally' block of handleChoiceClick.
    await generateImageForSection(newSection, `Concept art for "${BOOK_TITLE_BASE}": ${PROTAGONIST_NAME} deeply engaged in research related to ${newSection.title}. Abstract, intellectual, thematic elements related to ${chosenTopicGuess || choice.text}. Style: digital painting, atmospheric, subtle sci-fi elements.`);
    await generateChoicesForNextStep(newSection);

  } catch (error) {
    console.error("Error generating next story section:", error);
    updateStatus("Error: The chronicle faltered. An issue occurred with the AI.", true);
  } finally {
    isGenerating = false;
    updateButtonAndChoiceUI();
    saveStory();
  }
}

// --- Rendering ---
function displayStorySection(section: StorySection, animate = true) {
  if (storyContentElement.querySelector('.placeholder-text')) {
    storyContentElement.innerHTML = ''; // Clear placeholder
  }

  const sectionElement = document.createElement('section');
  sectionElement.id = section.id;
  sectionElement.setAttribute('aria-labelledby', `${section.id}-title`);

  const titleElement = document.createElement('h2');
  titleElement.id = `${section.id}-title`;
  titleElement.textContent = section.title;
  sectionElement.appendChild(titleElement);

  if (section.imageUrl) {
    const figure = document.createElement('figure');
    figure.classList.add('story-image-figure');
    const img = document.createElement('img');
    img.src = section.imageUrl;
    img.alt = section.imagePrompt || `Image for ${section.title}`;
    img.classList.add('story-image');
    figure.appendChild(img);
    sectionElement.appendChild(figure);
  }

  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = section.htmlContent; // Content is already parsed Markdown
  sectionElement.appendChild(contentDiv);

  // TTS Buttons
  const ttsContainer = document.createElement('div');
  ttsContainer.className = 'tts-buttons-container';

  const readAloudButton = document.createElement('button');
  readAloudButton.textContent = 'Read Aloud';
  readAloudButton.className = 'read-aloud-button';
  readAloudButton.setAttribute('aria-label', `Read aloud: ${section.title}`);
  readAloudButton.onclick = () => handleReadAloud(section.id);
  ttsContainer.appendChild(readAloudButton);

  const thematicNarrateButton = document.createElement('button');
  thematicNarrateButton.textContent = 'Thematic Narration';
  thematicNarrateButton.className = 'thematic-narrate-button';
  thematicNarrateButton.setAttribute('aria-label', `Generate and read thematic narration for: ${section.title}`);
  thematicNarrateButton.onclick = () => handleThematicNarration(section.id);
  ttsContainer.appendChild(thematicNarrateButton);
  
  sectionElement.appendChild(ttsContainer);


  storyContentElement.appendChild(sectionElement);
  if (animate) {
    sectionElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  // updateButtonAndChoiceUI(); // Update buttons after adding new section - Handled by parent function's finally block
}

function renderChoices(choices: { text: string; consequenceContext: string }[]) {
  choicesArea.innerHTML = ''; // Clear previous choices or loading messages
  if (choices && choices.length > 0) {
    choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.classList.add('choice-button');
      button.textContent = choice.text;
      button.setAttribute('aria-label', `Choice ${index + 1}: ${choice.text}. ${choice.consequenceContext}`);
      button.addEventListener('click', () => handleChoiceClick(choice));
      choicesArea.appendChild(button);
    });
    choicesLabel.classList.remove('choices-label-hidden'); // Show label now that choices are rendered
  } else {
    choicesLabel.classList.add('choices-label-hidden');
    choicesArea.innerHTML = "<p class='info-text'>No further paths divined at this moment.</p>"; // Fallback if somehow called with empty/null choices
  }
  // updateButtonAndChoiceUI(); // Parent's finally block will call this.
}

function updateStatus(message: string, isError: boolean = false) {
  statusArea.innerHTML = ''; 
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  statusArea.appendChild(messageElement);

  statusArea.className = isError ? 'status-error' : 'status-info';
  if (isError) {
    console.error("Status Update (Error):", message);
  }
}

function updateButtonAndChoiceUI() {
  const apiKeyMissing = !GEMINI_API_KEY || !ai;

  // Action Button (Restart)
  actionButton.disabled = isGenerating; 

  // Download Buttons
  downloadStoryButton.disabled = currentStory.length === 0 || isGenerating;
  downloadStoryTextButton.disabled = currentStory.length === 0 || isGenerating;

  // Choice Buttons
  const choiceButtons = choicesArea.querySelectorAll<HTMLButtonElement>('.choice-button');
  choiceButtons.forEach(button => {
    button.disabled = isGenerating || apiKeyMissing;
    if (isGenerating) {
        if (!button.dataset.originalText && button.textContent !== "Plotting Course...") {
            button.dataset.originalText = button.textContent || "";
        }
        button.textContent = "Plotting Course...";
    } else {
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            button.removeAttribute('data-original-text');
        }
    }
  });

  // Choices Label Visibility
  const hasActualChoiceButtons = choicesArea.querySelectorAll<HTMLButtonElement>('.choice-button').length > 0;
  const choicesAreaHasErrorOrInfoText = choicesArea.querySelector('.error-text, .info-text');

  if (hasActualChoiceButtons) {
    choicesLabel.classList.remove('choices-label-hidden');
  } else if (choicesAreaHasErrorOrInfoText || choicesArea.innerHTML.trim() === "" || isGenerating) {
    // Hide if error/info text is present, or if area is empty, or if currently generating (choices might appear)
    choicesLabel.classList.add('choices-label-hidden');
  } else {
    // Default to hidden if no specific condition to show is met (e.g. after clearing choices)
    choicesLabel.classList.add('choices-label-hidden');
  }


  // Chat Send Button
  chatSendButton.disabled = isGenerating || apiKeyMissing || chatInput.value.trim() === '';
  if (isGenerating && document.activeElement === chatSendButton) { 
      chatSendButton.textContent = '...';
  } else {
      chatSendButton.innerHTML = '➤'; // Use innerHTML for special character
  }


  // TTS Buttons within each story section
  document.querySelectorAll<HTMLButtonElement>('.read-aloud-button, .thematic-narrate-button').forEach(button => {
    const sectionElement = button.closest('section');
    if (!sectionElement) return;
    const sectionId = sectionElement.id;

    let specificReasonToDisable = false;
    let originalText = ""; // Will be set based on button type

    if (button.classList.contains('read-aloud-button')) {
      originalText = 'Read Aloud';
      specificReasonToDisable = currentSpeakingSectionId === sectionId;
      if (specificReasonToDisable) button.textContent = 'Reading...';
    } else if (button.classList.contains('thematic-narrate-button')) {
      originalText = 'Thematic Narration';
      // Check if *this specific button's* operation is active or if a global AI task (non-chat) is running
      specificReasonToDisable = currentThematicNarratingSectionId === sectionId;
      if (specificReasonToDisable) button.textContent = 'Narrating...';
    }
    
    // Disable if global AI task (isGenerating), API key missing, or this specific button's task is active
    button.disabled = isGenerating || apiKeyMissing || specificReasonToDisable;

    if (!specificReasonToDisable && !isGenerating) { // Only restore if not busy globally or specifically
        button.textContent = originalText;
    }
    if(apiKeyMissing) button.disabled = true; // Explicitly disable if key missing
  });

  if (apiKeyMissing && statusArea.textContent?.indexOf("API Key is missing") === -1) {
    updateStatus("Critical: Gemini API Key is missing. All AI-powered actions are disabled.", true);
  }
}


// --- Image Generation ---
async function generateImageForSection(section: StorySection, prompt: string) {
  if (!ai || !GEMINI_API_KEY) return; 

  const imageStatusId = `image-status-${section.id}`;
  updateStatus(`Evoking visual representation for "${section.title}"...`, false); // General status update
  section.imagePrompt = prompt; 

  try {
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002', 
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      section.imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
      
      const sectionElement = document.getElementById(section.id);
      if (sectionElement) {
        const existingImgFigure = sectionElement.querySelector('.story-image-figure');
        if(existingImgFigure) existingImgFigure.remove();

        const figure = document.createElement('figure');
        figure.classList.add('story-image-figure');
        const img = document.createElement('img');
        img.src = section.imageUrl;
        img.alt = section.imagePrompt || `Image for ${section.title}`;
        img.classList.add('story-image');
        figure.appendChild(img);
        
        const titleElement = sectionElement.querySelector('h2');
        if (titleElement && titleElement.nextSibling) {
            sectionElement.insertBefore(figure, titleElement.nextSibling);
        } else if (titleElement) { // Should ideally be after title, before content div
            const contentDiv = sectionElement.querySelector('div:not(.tts-buttons-container)');
            if (contentDiv) sectionElement.insertBefore(figure, contentDiv);
            else sectionElement.appendChild(figure);
        }
      }
      updateStatus(`Visuals for "${section.title}" materialized.`, false);
    } else {
      throw new Error("No image generated or empty response.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    updateStatus(`Could not generate image for "${section.title}".`, true);
    section.imageUrl = undefined; 
  }
  // saveStory(); // Parent function will save.
}


// --- Text-to-Speech ---
function handleReadAloud(sectionId: string) {
  if (isGenerating || !GEMINI_API_KEY) return; // Check global generating flag too
  const section = currentStory.find(s => s.id === sectionId);
  if (!section || !section.rawTextContent) return;

  stopAllNarration(); 

  currentSpeakingSectionId = sectionId;
  updateButtonAndChoiceUI(); 

  speakText(section.rawTextContent, () => {
    currentSpeakingSectionId = null;
    updateButtonAndChoiceUI(); 
  }, (errorEvent) => {
    console.error("TTS Error:", errorEvent);
    updateStatus(`Error reading aloud: ${errorEvent.error}`, true);
    currentSpeakingSectionId = null;
    updateButtonAndChoiceUI();
  });
}

async function handleThematicNarration(sectionId: string) {
  if (isGenerating || !GEMINI_API_KEY || !ai) return; // Check global flag
  const section = currentStory.find(s => s.id === sectionId);
  if (!section) return;

  stopAllNarration();

  currentThematicNarratingSectionId = sectionId;
  isGenerating = true; // Set global flag for this specific AI operation
  updateButtonAndChoiceUI(); 

  updateStatus(`Crafting thematic narration for "${section.title}"...`, false);

  const prompt = `
    You are a dramatic narrator. Based on the following story section from "${BOOK_TITLE_BASE}":
    Title: ${section.title}
    Content: "${section.rawTextContent}"
    Overall Theme: ${CORE_THEMES_AND_TOPICS_DESCRIPTION}

    Generate a concise, evocative, and thematic narration script (approx 50-100 words) that captures the essence and intellectual core of this section.
    The narration should sound like a voice-over deepening the understanding of ${PROTAGONIST_NAME}'s current endeavor.
    Focus on the key concepts, challenges, or breakthroughs.
    Output only the narration script text.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt, 
        config: { temperature: 0.6 }
    });
    const narrationScript = response.text;
    
    updateStatus(`Thematic narration for "${section.title}" ready. Speaking...`, false);
    // isGenerating is still true here from the start of this function
    speakText(narrationScript, () => {
      currentThematicNarratingSectionId = null;
      isGenerating = false; // Release global lock AFTER speech finishes
      updateButtonAndChoiceUI();
    }, (errorEvent) => {
      console.error("Thematic TTS Error:", errorEvent);
      updateStatus(`Error in thematic narration: ${errorEvent.error}`, true);
      currentThematicNarratingSectionId = null;
      isGenerating = false; // Release global lock on error too
      updateButtonAndChoiceUI();
    });

  } catch (error) {
    console.error("Error generating thematic narration script:", error);
    updateStatus("Error: Could not generate thematic narration script.", true);
    currentThematicNarratingSectionId = null;
    isGenerating = false; // Release global lock on script gen error
    updateButtonAndChoiceUI();
  }
}

function speakText(text: string, onEndCallback?: () => void, onErrorCallback?: (event: SpeechSynthesisErrorEvent) => void) {
  if (!('speechSynthesis' in window)) {
    updateStatus("Your browser does not support Text-to-Speech.", true);
    // FIX: Create a dummy utterance to satisfy the SpeechSynthesisErrorEventInit type
    const dummyUtterance = new SpeechSynthesisUtterance(''); // An empty utterance for type compatibility
    onErrorCallback?.(new SpeechSynthesisErrorEvent('error', {
      error: 'synthesis-unavailable',
      utterance: dummyUtterance // Provide the required utterance property
    }));
    return;
  }
  stopAllNarration(); 

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; 
  utterance.pitch = 1;
  utterance.rate = 1;

  currentSpokenUtterance = utterance;

  utterance.onend = () => {
    currentSpokenUtterance = null;
    if (onEndCallback) onEndCallback();
  };
  utterance.onerror = (event) => {
    currentSpokenUtterance = null;
    console.error("Speech synthesis error:", event);
    if (onErrorCallback) onErrorCallback(event);
    else updateStatus(`Speech error: ${event.error}`, true);
  };

  speechSynthesis.speak(utterance);
}

function stopAllNarration() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  if(currentSpokenUtterance) {
    currentSpokenUtterance.onend = null; 
    currentSpokenUtterance.onerror = null;
    currentSpokenUtterance = null;
  }
}


// --- Chat Functionality (Oracle Chat) ---
function initializeChat() {
  if (!ai || !GEMINI_API_KEY) {
    chatInput.placeholder = "Oracle Chat disabled (API Key missing).";
    chatInput.disabled = true;
    chatSendButton.disabled = true;
    return;
  }
  // System instruction will be dynamic in sendMessage if needed
  geminiChat = ai.chats.create({ model: 'gemini-2.5-flash-preview-04-17' }); 

  renderChatHistory(); 
  if (chatMessages.length === 0) {
    const systemGreeting: ChatMessage = { role: 'system', text: "The Oracle of Ascent awaits your consultation regarding O'Callaghan's journey."};
    chatMessages.push(systemGreeting); // Add to state
    addChatMessageToDisplay(systemGreeting, false); // Display without re-adding to state
  }
}

async function handleChatSend() {
  if (isGenerating || !geminiChat || !GEMINI_API_KEY) return;
  const messageText = chatInput.value.trim();
  if (!messageText) return;

  addChatMessageToDisplay({ role: 'user', text: messageText });
  chatInput.value = '';
  isGenerating = true; 
  updateButtonAndChoiceUI(); 

  try {
    const currentStorySnapshot = currentStory.length > 0 
        ? `Current Story Snapshot:\n${currentStory.slice(-2).map(s => `Title: ${s.title}\nSummary: ${s.rawTextContent?.substring(0,150)}...`).join('\n\n')}`
        : "The chronicle has not yet fully begun or is being restarted.";

    const chatSystemInstruction = `You are the Oracle of Ascent, a wise and ancient entity chronicling and commenting on the intellectual journey of ${PROTAGONIST_NAME} in "${BOOK_TITLE_BASE}".
Your knowledge spans all topics: ${CORE_THEMES_AND_TOPICS_DESCRIPTION}.
You have access to the current story context.
Respond to queries about ${PROTAGONIST_NAME}'s progress, the nature of his studies, potential future paths, or philosophical implications.
Keep responses insightful, slightly enigmatic, and thematic. Be concise (1-3 sentences usually). If asked about game mechanics, politely decline.
${currentStorySnapshot}`;

    // For Gemini API, recreating chat or sending history might be complex.
    // Simple approach: send message with updated system instruction if chat session doesn't retain it.
    // The 'ai.chats.create' with a static systemInstruction is often for the whole session.
    // For dynamic context, it might be better to include brief context in user message or re-create 'Chat' if API requires.
    // The current @google/genai Chat object should ideally manage history.
    // Let's try sending with the expectation that geminiChat maintains context + new message.
    // If not, the systemInstruction might need to be part of the message or chat re-init.
    // The provided guideline re-creates chat if history is long. Let's adapt that.
    
    let effectiveChatInstance = geminiChat;
    if (chatMessages.length > 10) { // Recreate for very long convos to refresh context for API
        const recentHistoryForAI = chatMessages.slice(-5).map(msg => `${msg.role}: ${msg.text}`).join('\n');
        effectiveChatInstance = ai!.chats.create({ 
            model: 'gemini-2.5-flash-preview-04-17',
            config: { 
                systemInstruction: `You are the Oracle of Ascent... (shortened for brevity, use full instruction)
                Recent Conversation: ${recentHistoryForAI}
                Current Story Context: ${currentStory.slice(-1)[0]?.rawTextContent?.substring(0,200) || 'No specific chapter context.'}`
            }
        });
    }


    // If the chat object doesn't implicitly use the config from `create`,
    // we might need to include system instruction with each message for some models/setups.
    // However, `Chat.sendMessage` should work with the context established by `ai.chats.create`.
    const response: GenerateContentResponse = await effectiveChatInstance.sendMessage({
      message: messageText,
      // Optional: if system instructions need to be resent or updated dynamically per message for this SDK version.
      // config: { systemInstruction: chatSystemInstruction } // Usually not needed if chat object holds it.
    });

    const aiResponseText = response.text;
    addChatMessageToDisplay({ role: 'ai', text: aiResponseText });

  } catch (error) {
    console.error("Error sending chat message:", error);
    addChatMessageToDisplay({ role: 'system', text: "The Oracle seems... disturbed. An error occurred." });
  } finally {
    isGenerating = false;
    updateButtonAndChoiceUI();
    saveStory(); 
  }
}

function addChatMessageToDisplay(message: ChatMessage, addToState: boolean = true) {
  if (addToState) {
    chatMessages.push(message);
  }
  // Render this specific message
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('chat-message', `chat-message-${message.role}`);
  // Basic text sanitization or use marked for limited markdown if desired for AI responses
  if (message.role === 'ai') {
      messageDiv.innerHTML = marked.parse(message.text) as string; // Parse AI markdown
  } else {
      messageDiv.textContent = message.text; // User/system text as is
  }
  chatHistoryDisplay.appendChild(messageDiv);
  chatHistoryDisplay.scrollTop = chatHistoryDisplay.scrollHeight;
}


function renderChatHistory() {
  chatHistoryDisplay.innerHTML = ''; 
  if (chatMessages.length === 0 && GEMINI_API_KEY) {
    const placeholder = document.createElement('p');
    placeholder.className = 'chat-placeholder';
    placeholder.textContent = "Consult the Oracle about O'Callaghan's Quantum Ascent...";
    chatHistoryDisplay.appendChild(placeholder);
    return;
  }

  chatMessages.forEach(msg => {
    // Use the single message display function to ensure consistency
    addChatMessageToDisplay(msg, false); // false: don't add to state again, just render
  });
}


// --- Utility Functions ---
function sanitizeHtml(htmlString: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const scripts = tempDiv.getElementsByTagName('script');
  while (scripts.length > 0) {
    scripts[0].parentNode?.removeChild(scripts[0]);
  }
  return tempDiv.innerHTML;
}

function parseJsonResponse(jsonString: string): any | null {
  try {
    let cleanJsonString = jsonString.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanJsonString.match(fenceRegex);
    if (match && match[2]) {
      cleanJsonString = match[2].trim();
    }
    return JSON.parse(cleanJsonString);
  } catch (error) {
    console.error("Failed to parse JSON response:", error, "Original string:", jsonString);
    // Do not updateStatus globally here, let the caller handle specific error messaging.
    return null;
  }
}

function downloadStoryAsHTML() {
  if (currentStory.length === 0) return;
  let htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${BOOK_TITLE_BASE}</title><style>
  body { font-family: serif; line-height: 1.6; margin: 20px; background-color: #f4f0ff; color: #101010; }
  section { margin-bottom: 2em; padding-bottom: 1em; border-bottom: 1px solid #ccc; }
  h1 { text-align: center; color: #333; } h2 { color: #555; }
  img { max-width: 100%; height: auto; display: block; margin: 1em 0; border: 1px solid #ddd; border-radius: 4px;}
  .story-image-figure { text-align: center; }
  </style></head><body><h1>${BOOK_TITLE_BASE}</h1>`;

  currentStory.forEach(section => {
    htmlContent += `<section><h2>${section.title}</h2>`;
    if (section.imageUrl) {
      htmlContent += `<figure class="story-image-figure"><img src="${section.imageUrl}" alt="${section.imagePrompt || 'Story image'}"></figure>`;
    }
    htmlContent += section.htmlContent; 
    htmlContent += `</section>`;
  });

  htmlContent += `</body></html>`;
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${BOOK_TITLE_BASE.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  updateStatus("Chronicle downloaded as HTML.", false);
}

function downloadStoryAsText() {
  if (currentStory.length === 0) return;
  let textContent = `${BOOK_TITLE_BASE}\n\n`;

  currentStory.forEach(section => {
    textContent += `## ${section.title}\n\n`;
    let sectionText = section.rawTextContent;
    if (!sectionText) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = section.htmlContent;
        sectionText = tempDiv.textContent || tempDiv.innerText || "";
    }
    textContent += sectionText.trim() + '\n\n---\n\n';
  });

  const blob = new Blob([textContent], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${BOOK_TITLE_BASE.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  updateStatus("Chronicle downloaded as plain text.", false);
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
