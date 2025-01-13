# ai_generator.py
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import torch
import asyncio
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class AIResponseGenerator:
    _instance = None
    _is_initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIResponseGenerator, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._is_initialized:
            self.initialize_model()
            AIResponseGenerator._is_initialized = True

    def initialize_model(self):
        try:
            # Initialize with DialoGPT-small for lighter weight
            self.model_name = "microsoft/DialoGPT-small"
            
            # Load model and tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
            
            # Move to GPU if available
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model.to(self.device)
            
            logger.info(f"Loaded AI model {self.model_name} on {self.device}")
            
        except Exception as e:
            logger.error(f"Error loading AI model: {str(e)}", exc_info=True)
            raise

    async def generate_response(self, user_message: str, chat_history: List[Dict] = None) -> str:
        """Generate AI response to user message"""
        try:
            # Run model in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                self._generate,
                user_message
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}", exc_info=True)
            return "I apologize, but I'm having trouble generating a response right now."

    def _generate(self, user_message: str) -> str:
        """Run model inference"""
        try:
            # Encode user input
            input_ids = self.tokenizer.encode(user_message + self.tokenizer.eos_token, return_tensors='pt')
            input_ids = input_ids.to(self.device)
            
            # Generate response
            outputs = self.model.generate(
                input_ids,
                max_length=100,
                pad_token_id=self.tokenizer.eos_token_id,
                no_repeat_ngram_size=2,
                temperature=0.7,
                top_k=50,
                top_p=0.9,
                num_return_sequences=1
            )
            
            # Decode response
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            return response.strip()
            
        except Exception as e:
            logger.error(f"Error in model inference: {str(e)}", exc_info=True)
            return "I apologize, but I'm having trouble understanding. Could you rephrase that?"