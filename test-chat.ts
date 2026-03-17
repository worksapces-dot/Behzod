const response = await fetch("http://localhost:3000/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messages: [
      {
        role: "user",
        content: "Hi! Can you check my memory for any notes on 'machine learning'?",
      },
    ],
  }),
});

const data = await response.json();
console.log("--- Agent Response ---");
console.log(data.response);
console.log("----------------------");
