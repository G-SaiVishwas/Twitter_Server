const express = require("express");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");

// Load environment variables
dotenv.config();
//This is a sample comment
class AIInfluencerManager {
  constructor() {
    // Google Generative AI Setup
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.textModel = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    this.imageModel = this.genAI.getGenerativeModel({
      model: "gemini-pro-vision",
    });

    // Twitter API Setup
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    // Unique AI Influencer Persona
    this.persona = {
      name: "Nova Anderson",
      age: 28,
      profession: "Tech Innovation Consultant",
      interests: [
        "Sustainable Technology",
        "Digital Wellness",
        "Future of Work",
        "AI Ethics",
      ],
      communicationStyle:
        "Professional yet approachable, with a hint of tech humor",
    };
  }

  async generatePersonaContent(context) {
    const prompt = `Create a social media post about ${context} from the perspective of ${
      this.persona.name
    }, a ${this.persona.profession} interested in ${this.persona.interests.join(
      ", "
    )}`;

    try {
      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Content generation error:", error);
      return null;
    }
  }

  async generatePostImage(contentDescription) {
    const imagePrompt = `Professional headshot of a diverse tech professional in a modern workspace, representing ${contentDescription}`;

    try {
      const result = await this.imageModel.generateContent(imagePrompt);
      return result.response.image();
    } catch (error) {
      console.error("Image generation error:", error);
      return null;
    }
  }

  async postToTwitter(textContent, imageBuffer = null) {
    try {
      if (imageBuffer) {
        // Upload media first
        const mediaId = await this.twitterClient.v1.uploadMedia(imageBuffer, {
          mimeType: "image/png",
        });

        // Post tweet with media
        return await this.twitterClient.v2.tweet({
          text: textContent,
          media: { media_ids: [mediaId] },
        });
      } else {
        // Post text-only tweet
        return await this.twitterClient.v2.tweet({
          text: textContent,
        });
      }
    } catch (error) {
      console.error("Twitter posting error:", error);
      return null;
    }
  }

  async generateInteractiveResponse(userMessage, userContext) {
    const prompt = `You are ${this.persona.name}, a ${this.persona.profession}. 
        Respond to the following message: '${userMessage}'
        
        Context Details:
        - User's message context: ${userContext}
        - Maintain a ${this.persona.communicationStyle} tone
        - Reference your professional interests: ${this.persona.interests.join(
          ", "
        )}`;

    try {
      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Interactive response generation error:", error);
      return null;
    }
  }

  // Advanced Context Analysis
  async analyzeUserContext(userMessage) {
    const contextAnalysisPrompt = `Analyze the following message and extract key contextual information:
        
        Message: ${userMessage}
        
        Provide insights on:
        - Emotional tone
        - Primary intent
        - Potential user interests
        - Suggested response approach`;

    try {
      const result = await this.textModel.generateContent(
        contextAnalysisPrompt
      );
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error("Context analysis error:", error);
      return null;
    }
  }
}

// Express Application Setup
const app = express();
app.use(cors());
app.use(express.json());

const influencerManager = new AIInfluencerManager();

// Middleware for error handling
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    details: err.message,
  });
};
app.use(errorHandler);

// Routes
app.post("/generate-post", async (req, res) => {
  try {
    const { context } = req.body;
    const content = await influencerManager.generatePersonaContent(context);
    const image = await influencerManager.generatePostImage(context);

    // Optional Twitter posting
    const tweetResult = await influencerManager.postToTwitter(content, image);

    res.json({
      content,
      imageGenerated: !!image,
      tweetPosted: !!tweetResult,
    });
  } catch (error) {
    res.status(500).json({ error: "Post generation failed" });
  }
});

app.post("/interact", async (req, res) => {
  try {
    const { userMessage, userContext } = req.body;

    // Analyze context first
    const contextAnalysis = await influencerManager.analyzeUserContext(
      userMessage
    );

    // Generate response based on context
    const response = await influencerManager.generateInteractiveResponse(
      userMessage,
      JSON.stringify(contextAnalysis)
    );

    res.json({
      response,
      contextAnalysis,
    });
  } catch (error) {
    res.status(500).json({ error: "Interaction failed" });
  }
});

// Server Configuration
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Influencer Server running on port ${PORT}`);
});

module.exports = app;
