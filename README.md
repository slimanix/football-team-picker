# SquadPick — 7-Player Football Team Balancer ⚽

A specialized web application designed to solve the age-old problem of organizing a football match with **7 players** (or any odd/even squad).

---

## 💡 How it Solves the 7-Player Problem

Having 7 players is one of the most frustrating numbers in amateur football because 3.5 vs 3.5 doesn't exist. This app provides **4 tailored solutions**:

1. **🟡 3 vs 3 + 1 All-Time Offense ("The Joker / Chameleon")**:
   - The 7th player wears a neutral bib and plays with whichever team possesses the ball.
   - Promotes quick passing, high stamina, and eliminates unequal outfield numbers.
2. **⚖️ 3 vs 4 Handicap Balance Mode**:
   - Puts the 3 highest-rated/stamina players on Team A and 4 players on Team B.
   - The combinatorial balancing algorithm minimizes the total skill difference so the game stays tight and competitive.
3. **⏱️ 3 vs 3 + 1 Rotating Sub / Shared GK**:
   - Includes a built-in match clock that sounds an authentic referee whistle every 5 minutes to swap the 7th player onto the pitch.
4. **👥 Flexible Squad Mode**:
   - Easily add or remove players if an 8th or 10th friend arrives!

---

## 🚀 Key Features

- **⚖️ Fair Balancing Engine**: Evaluates combinations to balance overall star ratings and roles (GK, DEF, MID, ATT).
- **📋 WhatsApp / Chat Export**: One-click copy formats the lineups with emojis and stats ready to paste directly into your football group chat.
- **⚽ Interactive 2D Pitch**: Visual field layout with tactical jerseys; click any two players to swap them.
- **🔊 Sound Synthesis (Zero Dependencies)**: Realistic Fox 40 referee whistle, coin toss chime, and crowd sounds generated purely via Web Audio API.
- **🪙 Captains' Coin Toss**: Virtual coin toss with 3D animation to decide first ball or first pick.
- **💾 Local Storage Persistence**: Player names, ratings, and positions are automatically saved for your next match.

---

## 🏃 How to Run

Simply open `index.html` in any web browser (Google Chrome, Microsoft Edge, Firefox, Safari) or on your mobile phone:

- **Path**: `C:\Users\elidr\.gemini\antigravity\scratch\football-team-picker\index.html`
