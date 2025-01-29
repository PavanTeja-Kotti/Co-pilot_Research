# Research Assistant WebApp

## Project Overview
Welcome to the Research Assistant WebApp developed by **Team Tech Titans** (Pavan, Dheeraj, Ankit, Krishna). This application is designed to revolutionize the way researchers interact with academic papers. Built with **Django** as the backend and **React** as the frontend, the application leverages **Django Rest Framework (DRF)** for APIs and **JWT authentication** for secure user access.

### Key Features

#### 1. **Research Paper Analytics**
- Track the number of papers read by a user.
- Analyze the time spent on each paper.
- Generate month-on-month statistics for research activity.

#### 2. **Recommendation System**
- Suggests the most relevant research papers based on:
  - User's bookmarked papers.
  - Previously read papers.

#### 3. **Research Assistant Page**
- Users can:
  - Make detailed notes on research papers.
  - Access a chatbot integrated across all pages for:
    - Summarizing research content.
    - Answering questions within the context of the paper.

#### 4. **Web Agent Integration**
- Enables users to:
  - Search the internet for relevant research materials.
  - Upload ZIP files containing PDF documents:
    - The app will unzip and process the PDFs.
    - Users can interact with the uploaded documents via chat.

#### 5. **Collaborative Chat Functionality**
- Create group chats based on similar research interests.
- Features an integrated research agent that:
  - Responds to queries when tagged (e.g., `@bot`).
  - Helps resolve research-related questions within the chat context.

---

## Technology Stack

### Backend
- **Django**: Provides a robust framework for backend development.
- **Django Rest Framework (DRF)**: Exposes APIs for seamless interaction between the frontend and backend.
- **JWT Authentication**: Ensures secure login and access management.

### Frontend
- **React**: Offers a dynamic and responsive user interface.

### Other Integrations
- **Chatbot**: Summarizes research papers and answers context-based questions.
- **Web Agent**: Searches the internet and processes uploaded documents.
- **Group Chat**: Enhances collaborative research.

---

## Installation and Setup

### Prerequisites
- Python 3.9+
- Node.js 16+
- npm or yarn

### Backend Setup
1. Clone the repository.
2. Navigate to the backend directory:
   ```bash
   cd Server/ReSearch
   ```
3. Create a virtual environment and activate it:
   ```bash
   python -m venv env
   source env/bin/activate  # For Windows: env\Scripts\activate
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Apply migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd Client/copilotall
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

---

## Usage
1. Register and log in to the application.
2. Explore research papers, make notes, and track your analytics.
3. Upload ZIP files or use the web agent to find and chat with relevant research papers.
4. Collaborate with other researchers using group chat.
5. Leverage the chatbot for summarization and query resolution.

---

## Team Members
- **Pavan**
- **Dheeraj**
- **Ankit**
- **Krishna**

---

## Future Enhancements
- Integrating machine learning models for more accurate recommendations.
- Adding support for additional file formats (e.g., Word documents).
- Enhancing analytics with advanced visualizations.

---

## License
This project is licensed under the MIT License. See the LICENSE file for details.

---

## Contributing
Contributions are welcome! Please fork the repository and create a pull request with your changes.

---

Thank you for exploring the Research Assistant WebApp! Together, let's make research more effective and efficient.

