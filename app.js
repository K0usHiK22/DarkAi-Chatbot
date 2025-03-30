// JAVASRCIPT CODE FOR THE CHATBOT STARTS FROM HERE

const Inputfield = document.querySelector(".prompt-input");
const Sendbutton = document.getElementById("send-prompt");
const stopbutton = document.getElementById("stop-prompt") 
const Chatcontainer = document.querySelector(".chats-container");
const addfiles = document.querySelector(".add-files")
const fileInput = document.getElementById("file-input");
const filePreviewContainer = document.getElementById("file-preview-container");

const API_KEY = "AIzaSyCCzn_rh6pzjzwFOAYxyijP9HB_z3T-zzw"; // YOUR API KEY
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Global variables

let Usermessage = "";
let ChatHistory = [];
let fileCount = 0; // To track file numbers
let interval;
let controller = new AbortController() // to abort the typing
let stoptyping = false

addfiles.addEventListener("click", () => fileInput.click())

fileInput.addEventListener("change", (event) => {
    const files = event.target.files;
    for (let file of files) {
        previewFile(file);
    }
});

function previewFile(file) {
    fileCount++; // Increment file count

    const reader = new FileReader()
    reader.onload = function (e) {
        const previewItem = document.createElement("div");
        previewItem.classList.add("preview-item");

        if (file.type.startsWith("image/")) {
            // If it's an image, show image preview
            previewItem.innerHTML = `
                <img src="${URL.createObjectURL(file)}" alt="Selected Image">
                <button class="remove-file">×</button>
            `;
        } else {
            // If it's a document, show document icon with number
            previewItem.innerHTML = `
                <div class="document-icon">${fileCount}</div>
                <button class="remove-file">×</button>
            `;
        }

        // Remove file when clicking the close (X) button
        previewItem.querySelector(".remove-file").addEventListener("click", () => {
            previewItem.remove();
            fileCount--; // Decrease file count when removing
            updateDocumentNumbers(); // Update numbers after removing
        });

         filePreviewContainer.appendChild(previewItem); 

    }
    reader.readAsDataURL(file)

}

// Function to update documents
function updateDocumentNumbers() {
    const docIcons = document.querySelectorAll(".document-icon");
    docIcons.forEach((icon, index) => {
        icon.textContent = index + 1; // Re-number the documents
    });
}

// Function to Fetch Gemini AI API Response

async function fetchbotresponses(message, base64Files = []) {

    controller.abort()
    controller = new AbortController() // to abort the typing or any async program
    stoptyping = false

    const recentChatHistory = ChatHistory.slice(-5).flatMap(chat => ([
        { role: "user", parts: [{ text: chat.user }] },
        { role: "model", parts: [{ text: chat.bot }] }
    ])); // this bot remembers only 5 last messages of chat as chat history

    let userParts = [{ text: message }]

    // base64files to accept file input as gemini accepts base64files form

    base64Files.forEach(file => {
        if (file.mimeType && file.data) {
            userParts.push({ 
                inlineData: { 
                    mimeType: file.mimeType, 
                    data: file.data 
                } 
            });
        } else {
            console.error("Missing mimeType or Data!", file);
        }
    });

    const requestBody = {
        contents: [
            ...recentChatHistory,
            { role: "user", parts: userParts } // ADD User message & images
        ]
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
            
        });
        console.log("final API body", JSON.stringify({ contents: recentChatHistory }, null, 2))
        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);
        
        let botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't understand that.";

        // Convert Markdown to HTML

        botResponse = botResponse
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')      
            .replace(/```\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')  
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>'); 

        return botResponse;

    } catch (error) {
        console.error("Error:", error);
        return "Oops! Something went wrong.";
    }
}



// Typing Effect to make it look more dynamic

const typetext = (botResponse, botmessagediv) => {
    let index = 0;
    let tempText = "";
    stoptyping = false

    botmessagediv.innerHTML = `<img class="chat-img" src="assets/bot.svg" alt="image">
    <p class="text"></p>`;
    const textElement = botmessagediv.querySelector(".text");

    interval = setInterval(() => {
        if (index < botResponse.length) {
            tempText += botResponse[index];

            textElement.innerHTML = tempText.replace(/\n/g, "<br>");

            index++;
        } else {
            clearInterval(interval);
            textElement.innerHTML = botResponse;
            Sendbutton.style.display = "block";
            stopbutton.style.display = "none";

            ChatHistory.push({ user: Usermessage, bot: botResponse });
        }
        
    }, 10);
};

document.getElementById("stop-prompt").addEventListener("click", () =>{
    stoptyping = true
    controller.abort()

// to stop typing when clicked on stop icon which interrupts the interval and stops getting data
})

// Function to Handle Message Send

async function Messagehandle() {
    Usermessage = Inputfield.value.trim();
    if (!Usermessage) return;

    Sendbutton.style.display = "none";
    stopbutton.style.display = "block";

    const CreateMsgElement = (message, classname) => {
        const div = document.createElement("div");
        div.classList.add("message-text", classname);
        div.innerHTML = `<p class="text">${message}</p>`;
        return div;
    };

    // Append User Message
    const Usermessagediv = CreateMsgElement(Usermessage, "user-message-text");
    Chatcontainer.appendChild(Usermessagediv);
    Inputfield.value = "";

    let base64Files = [];
    const files = fileInput.files;

    for (let file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        await new Promise((resolve) => {
            reader.onload = () => {
                let base64Data = reader.result.split(",")[1];
                let mimeType = file.type;  // Extract Base64 without prefix
                base64Files.push({
                    mimeType: mimeType,
                    data: base64Data
                });

                // Show uploaded images or documents in chat
                const filediv = document.createElement("div");
                filediv.classList.add("message-text", "user-message-text");
                
                if(file.type.startsWith("image/")){
                    filediv.innerHTML = `<img class="uploaded-image" src="${reader.result}" alt="Image">`;
                }else{
                    filediv.innerHTML = `<div class="document-message">
                    <img src="assets/document.svg" alt="Document">
                    <span>${file.name}</span>
                </div>`
                }
                Chatcontainer.appendChild(filediv);
               

                resolve();
            };
        });
    }
    

    // Clear file input and preview
    filePreviewContainer.innerHTML = "";
    fileInput.value = "";
    fileCount = 0;

    // append ... as typing animation
    let botMsgtext = `<img class="chat-img" src="assets/bot.svg" alt="image">
    <div class="typing-loader">
        <span></span><span></span><span></span>
    </div>`;
    const botmessagediv = CreateMsgElement(botMsgtext, "bot-message-text");
    Chatcontainer.appendChild(botmessagediv);

    // Fetch AI Response and Display
    setTimeout(async () => {
        const botResponse = await fetchbotresponses(Usermessage, base64Files);
        botmessagediv.innerHTML = "";
        typetext(botResponse, botmessagediv);

        Sendbutton.style.display = "none";
        stopbutton.style.display = "block";
    }, 600);
}

stopbutton.addEventListener("click", () => {
    stoptyping = true;
    controller.abort();
    clearInterval(interval)

    // Show send button and hide stop button when stopping
    Sendbutton.style.display = "block";
    stopbutton.style.display = "none";
});


// Main Function to execute the program
function main() {
    Inputfield.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            Messagehandle();
        }
    });

    Sendbutton.addEventListener("click", () => {
        Messagehandle();
    });

    // Multi-line text animation
    var typed = new Typed('.multi-line-text', {
        strings: ['Welcome to Dark-Themed CHATBOT', 'Text me if you have any doubt or need help', 'Chatbot may not be accurate', 'Lets chat', ],
        typeSpeed: 20,
        backSpeed: 40,
        backDelay: 2000,
        loop: true
      });

}
// Initialize Chatbot
main();


// END OF JS
// FEEL FREE TO CHANGE OR MODIFY