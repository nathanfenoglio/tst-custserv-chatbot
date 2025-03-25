
# Customer Service Chatbot

chatbot is run locally with documents provided by user and only able to be accessed per user per login
able for user to control what documents are used for their personalized chatbot, other users do not have access to the documents uploaded by individual user giving user ability to access all of their personal document information and avoiding concern that their information would be visible to other parties
entirely locally but able to be accessed by users with login credentials remotely through web browser 

# Setup Instructions
- if wanting to run on 2 separate computers clone backend repo on one computer and frontend repo on another
#### clone backend  
- git clone https://github.com/nathanfenoglio/tst-custserv-chatbot-backend.git
- npm install 

#### clone frontend 
- git clone https://github.com/nathanfenoglio/tst-custserv-chatbot.git
- npm install

#### Astra DB
- astra datastax vector database https://accounts.datastax.com/
- create database
- create database collection per user
- get api key and app token from astra website for database collection
- create .env file for both frontend and backend and save your credentials from astra db for the project
    - ASTRA_DB_NAMESPACE="default_keyspace"
    - ASTRA_DB_COLLECTION="your_collection_name"
    - ASTRA_DB_API_ENDPOINT="your_astra_db_endpoint"
    - ASTRA_DB_APPLICATION_TOKEN="your_astra_db_application_token"

#### Firebase
- for authentication https://firebase.google.com/docs/auth
- create project https://console.firebase.google.com/
- click on Build > Authentication
- Get started
- select Email/Password under Native providers
- enable Email/Password under Sign-in providers
- Select a platform to get started: select "</>" for web app
- click on Project settings (gear icon next to Project Overview) to get firebase credentials for frontend .env file
    - you can just copy from firebaseConfig example that is provided and adjust the variable names like below
- add to frontend .env file
    - NEXT_PUBLIC_API_KEY=<Web API Key>
    - NEXT_PUBLIC_AUTH_DOMAIN=<Project ID>.firebaseapp.com
    - NEXT_PUBLIC_PROJECT_ID=<Project ID>
    - NEXT_PUBLIC_STORAGE_BUCKET=<Project ID>.firebasestorage.app
    - NEXT_PUBLIC_MESSAGING_SENDER_ID=<Project number>
    - NEXT_PUBLIC_APP_ID=<App ID>
- to add users (admin needs to add users, not allowing a sign up feature to keep private)
    - click on Authentication tab
    - Add user
    - enter user's email and initial password (they can reset their password through the app and receive reset link through email later)

#### Google Drive
- for document storage folder per user
- https://console.cloud.google.com/
    - create project
    - search for google drive api in search bar and select to enable
    - from dashboard left side bar menu click on IAM & Admin > Service Accounts
    - select + Create service account
    - once done creating service account, select keys, add key > Create new key
    - JSON file automatically downloads, save the file and rename it client_secret.json and store in backend top level directory

- create separate folders per user in google drive
    - go into folder and copy the last part of the url https://drive.google.com/drive/u/1/folders/this_part
    - save last part of urls for google drive folder ids for driveFolderIdsToLocalFolder gitignored file in backend

- go to google drive folders that you will be using for the various users' documents
    - click on share
    - add the email address that you are given for the service account
    - this is needed for the backend to be able to access the users' google drive folders

#### Google Apps Script
- https://script.google.com/home/
- '+' New project
- create new script + Script
- in backend repo there is google_apps_scripts folder > Code.gs
- copy code from Code.gs and paste into the google apps script that you just created
    - need to get url from backend to insert in the below code block
    - ![alt_image](https://github.com/nathanfenoglio/tst-custserv-chatbot/blob/main/readme_images/1.png)
    - 
- schedule google apps script to be run at whatever interval
    - click on triggers
    - add trigger
    - choose which function to run "onFileUpload"
    - select event source: Time-driven
    - select type of time based trigger: minutes timer
    - select minute interval: Every minute (or choose whatever interval suits you)

#### ngrok
- for getting url for backend to receive POST request from google apps script and for frontend to serve website
- https://download.ngrok.com/downloads/
- instructions for setting up ngrok: https://www.youtube.com/watch?v=aFwrNSfthxU

#### Ollama
- on frontend computer install ollama for hosting LLM
    - https://ollama.com/download
    - ollama pull nomic-embed-text
    - ollama pull whatever_model_you_want_to_run (I used llama3.2:3b)
- on backend computer install ollama just for embedding text from documents to send to astradb
    - https://ollama.com/download
    - ollama pull nomic-embed-text

#### gitignored files that you will need to set up (frontend)
- frontend:
    - scripts/userEmailsCollections.ts 
        - ![alt_image](https://github.com/nathanfenoglio/tst-custserv-chatbot/blob/main/readme_images/2.png)
    - .env
        - astra db credentials
        - ASTRA_DB_NAMESPACE="default_keyspace"
        - ASTRA_DB_COLLECTION="xxxxx"
        - ASTRA_DB_API_ENDPOINT="https://xxxxx.apps.astra.datastax.com"
        - ASTRA_DB_APPLICATION_TOKEN="xxxxx"
        -
        - firebase credentials
        - NEXT_PUBLIC_API_KEY=xxxxx
        - NEXT_PUBLIC_AUTH_DOMAIN=xxxxx.firebaseapp.com
        - NEXT_PUBLIC_PROJECT_ID=xxxxx
        - NEXT_PUBLIC_STORAGE_BUCKET=xxxxx.firebasestorage.app
        - NEXT_PUBLIC_MESSAGING_SENDER_ID=xxxxx
        - NEXT_PUBLIC_APP_ID=xxxxx
    - log.txt
        - just create empty file, it will be populated by questions and answers as they come
    
#### gitignored files that you will need to set up (backend):
- backend:
    - scripts/localFoldersPerUserCollectionName.ts
        - ![alt_image](https://github.com/nathanfenoglio/tst-custserv-chatbot/blob/main/readme_images/3.png)
    - scripts/userEmailsCollections.ts
        - ![alt_image](https://github.com/nathanfenoglio/tst-custserv-chatbot/blob/main/readme_images/4.png)
    - .env
        - astra db credentials
        - ASTRA_DB_NAMESPACE="default_keyspace"
        - ASTRA_DB_COLLECTION="xxxxx"
        - ASTRA_DB_API_ENDPOINT="https://xxxxx.apps.astra.datastax.com"
        - ASTRA_DB_APPLICATION_TOKEN="xxxxx"
    - client_secret.json
        - should have copied file and put in top level of backend going through google drive setup
    - driveFolderIdToLocalFolder.js
        - ![alt_image](https://github.com/nathanfenoglio/tst-custserv-chatbot/blob/main/readme_images/5.png)
    - folderIdsCollections.js
        - SCREENSHOT OF CODE...6
        - ![alt_image](https://github.com/nathanfenoglio/tst-custserv-chatbot/blob/main/readme_images/6.png)    
#### frontend
- npm run dev
- ngrok http 3000 
    - the url that is generated will be the url that the user goes to to access chat interface/login/etc

#### backend
- node server.js (should see Listening on port 3001)
- ngrok http 3001 (will need to provide url to use in google apps script)
    - ![alt_image](https://github.com/nathanfenoglio/tst-custserv-chatbot/blob/main/readme_images/1.png)


