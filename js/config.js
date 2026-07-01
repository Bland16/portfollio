// ═══════════════════════════════════════════════════════════
// config.js — All user-editable content lives here
// Add projects, rename cabins, change colors — all from this file
// ═══════════════════════════════════════════════════════════

// ── GLOBAL SCALE ────────────────────────────────────────────
// Applied to all three GLBs uniformly.
// Change this one value if models appear too big or small.
export const MODEL_SCALE = 14.29

// ── SEAT HEIGHT ─────────────────────────────────────────────
// Y position of the seat surface inside the cabin (in scene units)
// Scaled automatically — adjust the base value (0.3) if needed
export const SEAT_Y = 0.3 * MODEL_SCALE

// ── COVER PAGE ──────────────────────────────────────────────
// Used only in the locally-generated PDF — not rendered on the live site.
// Contact links (LinkedIn, email) are pulled automatically from your
// About Me items below, so no need to duplicate them here.
// ⚠️  Public repo: avoid phone numbers or personal emails.
export const COVER = {
  name:    'Sarah Bland',                        // ← replace
  tagline: 'Engineer · Designer · Builder',   // ← your tagline
}

// ── CABIN DEFINITIONS ───────────────────────────────────────
// 6 cabins, one per section
// attachIndex: which of the 12 wheel attach points to use (0–11)
//              every other point = 0, 2, 4, 6, 8, 10
export const CABINS = [
    {
    id: 'hobby-work',
    label: 'The Portfolio',
    attachIndex: 8,
     items: [
    {
      glb: 'models/wheel-rails.glb',
      seat: 'left',
      positionOffset: [
        -0.8,
        1.4,
        3.1,
      ],
      scale: 5,
      rotationY: 2.2,
      label: 'The Ferris Wheel',
      description: 'I love the beach. Every time I have the opportunity to visit one, I find myself transfixed by the Ferris wheels. There\'s a certain elegance to the architecture and lighting design that tricks the mind into seeing them fly. When it came time to build my portfolio, I thought it would be nice if I could fly, too.\n\nThe wheel and stand together contain 73 named mesh bodies. There are 12 empties that work as attachment point anchors, one per spoke. The code reads these coordinates to position each cabin precisely on the wheel. The wheel serves as the navigational hub of the portfolio, each cabin contains a collection of projects that visitors can view by clicking on a spoke. ',
      skills: [
        'threejs',
        'javascript',
        'blender',
        'fusion-360',
        'cad',
        'web-dev',
        'problem-solving',
      ],
    },
    {
      glb: 'models/wheel-stand.glb',
      seat: 'left',
      positionOffset: [
        -0.8,
        1.4,
        3.1,
      ],
      scale: 5,
      rotationY: 2.2,
    },
    {
      glb: 'models/cabin.glb',
      seat: 'right',
      positionOffset: [
        0.7,
        2.5,
        4,
      ],
      scale: 14.5,
      rotationY: 3.8,
      label: 'The Cabin',
      description: 'I follow the same build pipeline for every model in the scene: design in Fusion 360, export as an FBX, reposition and name all bodies in Blender, add animation empties where needed, export as a GLB, and then re-apply all base materials by mesh name prefix in Three.js.\n\nThe cabin is built from 79 individually named mesh bodies. The material system reads each name prefix and assigns the correct color in code depending on the \'vibe\' (the active color theme), so every cabin in the scene actually shares one base GLB. Two animation empties drive the door swing, timed to the camera transition into the interior. There is also an empty for the seat height of the left and right seats. The code places project objects at the coordinate of the empty. In dev mode, I can manually drag, scale, position, and rotate the objects exactly where I want them to sit in the cabin relative to the seats. A config file assigns the objects descriptions which visitos can access through by clicking on the object to open a side panel. ',
      skills: [
        'blender',
        'fusion-360',
        'cad',
        'threejs',
        'javascript',
        'web-dev',
      ],
    },
    {
      glb: 'models/booth.glb',
      seat: 'left',
      positionOffset: [
        -0.1,
        0,
        0.1,
      ],
      scale: 9,
      rotationY: 1.55,
      label: 'The Ticket Booth',
      description: 'Sir\'s ticket stand was modeled in Fusion 360 across 36 mesh bodies. The booth was made by creating a custom rectangular prism in  Fusion 360 and having it follow a custom pattern along a path to create the overarching shape. The booth provides a strong visual counterweight to the wheel and button enclosure on screen left. The center of the booth has an empty which helps center Sir at the correct height and depth of the booth regardless of booth location. \n\nIt is also home to Sir Matcher. When Sir is clicked, the camera orbits to the ticket booth, locks into a fixed position, and switches its target to him.',
      skills: [
        'fusion-360',
        'cad',
        'blender',
      ],
    },
    {
      glb: 'models/robot.glb',
      seat: 'left',
      positionOffset: [
        -0.2,
        0,
        -2.6,
      ],
      scale: 20.5,
      rotationY: -1,
      label: 'Sir Matcher',
      description: 'Sir Matcher was modeled in Fusion 360 across 42 mesh bodies including a top hat, monocle, clock, face, eyebrows, and glowing pupils. He is a rather dapper fellow modeled after Alfred the Butler from the Batman series, so the third vibe \'Pop Art\' (inspired by Batman: Brave and the Bold) is where he feels most at home. His 30 animation empties inform his idle movements, mouse tracking, expressions, and talking animations. When speaking, his jaw moves on word boundaries via the Web Speech API onboundary event, synced to a British male voice selected from available system voices at runtime. Expression animation methods fire based on the conversation topic at the moment speech begins. He tracks the mouse cursor in real-time as visitors explore the site.\n\nThe conversation system is made up of handwritten phrases. I built a four-tier classification algorithm in pure JavaScript that routes each message through exact social pre-matching, Levenshtein-based typo correction, direct keyword scoring, and topic bucket retrieval before falling back to a phrase bank scan. A backend Python machine learning algorithm runs alongside it, learning from chat history to suggest improved responses over time. Unknowns are deflected with a contextual fallback and logged silently to a Google Form in the background. Question mirroring extracts the subject from common question structures and echoes it back before responding.',
      skills: [
        'threejs',
        'javascript',
        'web-dev',
        'python',
        'machine-learning',
        'blender',
        'fusion-360',
        'cad',
        'problem-solving',
      ],
      pdfRotationY: -1.5707963267948966,
    },
    {
      glb: 'models/keycap_vibes.glb',
      seat: 'right',
      positionOffset: [
        -0.3,
        1.1,
        -4.8,
      ],
      scale: 2,
      rotationY: -1.25,
      label: 'Vibe Switcher',
      description: 'A keyboard keycap on the front page cycles through the site\'s visual palette through seven distinct themes: Aurora, Suave, Carnival, Pop Art, Blueprint, Midnight Arcade, and Pastel Dream. On load, a 30-frame rAF benchmark runs alongside hardware heuristics: device memory, core count, max texture size, and mobile detection. The combined score determines how far the post-processing stack scales back on lower-end devices.\n\nEach theme is a delta patch against a shared base material set. The vibe properties are specified in a config document, and the system merges them on top at each \'vibe-switch\'. Every named mesh in the scene responds simultaneously. Each vibe includes distinct custom components. For instance, Blueprint sets each structural mesh to wireframe and activates OutlinePass, turning the scene into a technical drawing, Midnight Arcade adds scanlines and pushes bloom to maximum, and Aurora runs a custom GLSL shader alongside a particle rain system.\n\n',
      skills: [
        'threejs',
        'javascript',
        'web-dev',
        'problem-solving',
      ],
    },
    {
      glb: 'models/object-camera.glb',
      seat: 'right',
      positionOffset: [
        1,
        0,
        -1.9,
      ],
      scale: 1,
      rotationY: 3,
      label: 'Camera System',
      description: 'I built three distinct camera modes for this experience: Orbit allows for a free look around the wheel, Transit provides a smooth tween to a selected cabin, and Interior locks the view inside a cabin using a precise position offset and look target set in the config file. This allows for the user to have a variety of interactions with the site and prevents the experience from feeling repetitive. There is also an Auto-Explore feature that automatically cycles through every cabin on a timer. You can press \'A\' inside any cabin to activate it. This carries the cabin exploration over to devices without attached keyboards such as mobile devices. ',
      skills: [
        'threejs',
        'javascript',
        'web-dev',
        'problem-solving',
      ],
      pdfRotationY: -1.5707963267948966,
    },
  ]
  },
  {
    id: 'digital-projects',
    label: 'Digital Projects',
    attachIndex: 0,
    items: [
      {
        "glb": "models/object-project-makeup-trey.glb",
        "seat": "left",
        "positionOffset": [-0.1, 0.5, 3.1],
        "scale": 10,
        label: 'CAD-Modeled and 3D-Printed Makeup Tray',
        description: 'I created this makeup tray as a simple, clean solution to streamline my daily makeup routine. This tray removed a step from my day of opening and sifting through a makeup bag for what I needed. Before it was implemented, I was using a paper plate for the same purpose, but I decided a tray would allow for ease of use, more space, and aesthetic improvement. I designed the model in Fusion 360 and printed it on a Prusa XL in PLA at a size of approximately 18 cm × 10 cm × 4 cm. Key features include an open top and front for dual access, separated hollow, ribbed sides for content visibility, and a raised base split across four interlocking pieces. I added four interlocking pieces on the bottom because if they were connected to the initial design, the bottom would be completely raised by supports in order to be 3D printed, which would have tarnished the finish and wasted PLA. I also included the open top and front so the tray could be placed at eye level or table height without adjustment of use. I still use it each day, and it saves me about 10 minutes and a gram of frustration a day.',
        skills: [
          'fusion-360',
          'cad',
          '3d-printing',
        ],
        pdfExport: {
          hardware: true,
          software: true,
          all: true,
        },
        images: [
          {
            src: 'photos/makeup-trey-1.jpg',
            date: '02/18/2026',
          },
        ],
      },
      {
        "glb": "models/openDots.glb",
        "seat": "left",
        "positionOffset": [-0.4, 0.5, 0.6],
        "scale": 11.5,
        label: 'OpenDots for Braille Literacy | Babson Hackathon 2026',
        description: 'I built the full Fusion 360 model for a digital Braille‑style display during Babson University’s 2026 five‑hour hackathon. There is a rapid decrease in Braille literacy among blind adults despite Braille‑literate individuals making up the majority of employed blind individuals, so we created this solution to address the gap in literacy education between visually impaired and able-bodied children. I named each individual solenoid body in the model in Blender so our code could target individual pins in real time. In the physical prototype stage, we would need to incorporate shift registers, which can only map eight Arduino pins at once, so I decided to create the grid in a layout of 8×12 and name them row by column for easy code manipulation. Given the time constraints and the depth of soldering required, we could only create a website, code, and digital model. When a user pressed a letter on our website, a teammate’s image‑analysis algorithm recognized the character and triggered the corresponding pins in the 3D model, creating a live, interactive Braille output experience. The demo worked and is visible, among other details, in the linked GitHub repository. \n \n*My collaborator on this project was Roman Pisani*',
        link: 'https://github.com/romanobro56/OpenDots',
        skills: [
          'fusion-360',
          'cad',
          'blender',
          'teamwork',
          'problem-solving',
        ],
        pdfExport: {
          hardware: true,
          software: false,
          all: true,
        },
        images: [
          {
            src: 'photos/Open-dots.jpg',
            date: '04/11/2026',
          },
          {
            src: 'photos/open-dots-2.jpg',
            date: '04/11/2026',
          },
          {
            src: 'photos/open-dots-3.jpg',
            date: '04/11/2026',
          },
        ],
      },
      {
        "glb": "models/tree.glb",
        "seat": "left",
        "positionOffset": [-0.8, 0, -2.6],
        "scale": 0.6,
        label: 'Tree Distance Algorithm For Pesticide Application | USDA, Boston College Engineering',
        description: 'I built and trained a machine learning model to estimate the distance of a tree from a camera, aiming to optimize pesticide application. The model was created for a larger code base that is being developed by the USDA to greatly reduce pesticide waste and the associated runoff pollution. The training image dataset was cleaned and refined in collaboration with my partner, Michael Busa. I took his tree masks and developed a random forest regression model that looked at various features of the tree mask and used that to categorize the distance the tree was from the camera. Following the completion of our code, we delivered a presentation on our findings to the engineering department. As the research this project contributed to has not yet been published, detailed methodology and data are available upon request. Our model had an RMSE of 0.02 meters and an MAE of 0.0069 meters. Among the images we saved for testing data, we had a 100% accuracy rating in our confidence interval, with only one differentiation from true values, sitting at 0.06 meters.',
        skills: [
          'python',
          'machine-learning',
          'teamwork',
          'communication',
          'public-speaking',
          'problem-solving',
        ],
        pdfExport: {
          hardware: true,
          software: 'flagship',
          all: 'flagship',
        },
        pdfSummary: 'I built and trained a machine learning model in Python to estimate the distance of a tree from a camera, aiming to optimize pesticide application with my partner Michael Busa. We constructed and delivered a presentation on our code within a two-week timeline.  As the research this project contributed to has not yet been published, detailed methodology and data are available upon request.',
        problem: 'At present, pesticide application in the United States is either applied by hand or using a set value which doesn\'t differentiate between tree size, distance or species. This wasted product not only costs significantly more than an optimized approach but can have unintended consequences on nearby populations. ',
        outcome: 'My model achieved a Root Mean Squared Error (a measurement of the magnitude of average error of our model) of 0.02 meters, which was two orders of magnitude lower than our intended distance range of 1.5 - 3 meters. Additionally, it reached a Mean Absolute Error of 0.0069 meters. ',
        contribution: 'I developed a machine learning model trained on masked tree images cleaned by an algorithm written by my partner Michael Busa. My contribution to this project entailed selecting the best-fit regression model, choosing and assigning weights to heuristics for the model to consider, and assisting Michael in the iteration process for selecting the best tree-masking strategy. ',
        lessons: 'I learned that iteration is the beginning of success, not the end of it. I also learned the significance of minimal changes to heuristic weights in training ML algorithms. ',
        images: [
          {
            src: 'photos/tree-distance-1.jpg',
            date: '03/31/2026',
          },
        ],
        technicalDoc: {
          size: 'sm',
          skills: [
            'python',
            'machine-learning',
            'teamwork',
            'communication',
            'public-speaking',
            'problem-solving',
          ],
          pdfSkip: {
            hardware: false,
          },
          docs: [
            {
              src: 'photos/schematics/tree-past-solutions.png',
              stage: 'ITERATION',
              caption: 'This is a slide from our presentation which includes a compilation of image-processing techniques which we ultimately abandoned in favor of our present choices.',
            },
          ],
        },
      },
      {
        "glb": "models/tideflow.glb",
        "seat": "right",
        "positionOffset": [-0.3, 0, -3.1],
        "scale": 0.3,
        label: 'TideFlow | Personal Scheduling App',
        description: 'I built TideFlow, a scheduling app designed around ADHD cognitive patterns, for my brother who was having difficulty managing his schedule. I implemented it using an Object-Oriented Framework in JavaScript. I created a 20-page design spec based on interviews with him and identifying features that would best address his needs. I implemented the system using an iterative rapid-development approach over one week. TideFlow includes a machine learning engine that reads real versus estimated task duration, task satisfaction by category, burnout levels, and when the user prefers to schedule tasks, and it suggests tasks when prompted and provides corrected time estimates for user-added tasks. The model updates per task using recency weighting and satisfaction scores, and it applies safe multipliers to avoid overcorrection. I also built the scheduling logic, which enforces ADHD-friendly rules like protected deep-work windows, nightly cutoffs, burnout-mode load reduction, and collision detection for fixed and flexible tasks. The app includes four views, drag-and-drop rescheduling, ICS export, and a daily survey that feeds back into the ML loop.',
        skills: [
          'machine-learning',
          'prompt-engineering',
          'ui-design',
          'problem-solving',
        ],
        pdfExport: {
          software: false,
          all: false,
        },
        problem: 'Although normal scheduling applications are helpful with remembering what someone has planned, they offer no guidance as to how to actually schedule out your time. Thus, it can be easy for someone with ADHD to both over and under book their schedule. ',
        outcome: 'TideFlow contributed to a 15% increase in my brother\'s weekly satisfaction rating (collected by TideFlow for machine learning purposes) over the span since he first implemented it.',
        lessons: 'I learned how important it is to consider user feedback in the implementation process. I went into this project with a clear idea of what could benefit my brother, but through user interviews, I was able to refine my vision to what would be practically beneficial to my target user. ',
        images: [
          {
            src: 'photos/tideflow-1.jpg',
            date: '05/23/2026',
          },
          {
            src: 'photos/tideflow-2.jpg',
            date: '05/23/2026',
          },
          {
            src: 'photos/tideflow-3.jpg',
            date: '05/23/2026',
          },
          {
            src: 'photos/tideflow-4.jpg',
            date: '05/23/2026',
          },
        ],
      },
      {
        "seat": "left",
        "positionOffset": [0.8, 0.5, 1.2],
        "scale": 15,
        "glb": 'chips.glb',
        label: 'Poker Chips for the Visually Impaired',
        description: 'I designed these poker chips specifically for colorblind players. Since standard poker chip values rely heavily on color differentiation, I introduced four distinct values based on interior geometric cutouts. This approach preserves stackability while allowing for clear tactile and visual differentiation. Each denomination is based on a card suit (such as Clubs, Spades, Hearts, and Diamonds) for immediate recognizability and clean design aesthetic.\n\nI modeled the chips in Fusion 360 and 3D-printed them in PLA on a Prusa MINI, with each chip measuring 39mm in diameter and 0.5–1mm in thickness.',
        skills: [
          'fusion-360',
          'cad',
          '3d-printing',
        ],
        pdfExport: {
          hardware: true,
          software: true,
          all: true,
        },
        images: [
          {
            src: 'photos/chips-1.jpg',
            date: '03/10/2026',
          },
        ],
        technicalDoc: {
          size: 'md',
          skills: [
          ],
          docs: [
            {
              src: 'photos/schematics/poker-chip-og.png',
              stage: 'SKETCHING',
              caption: 'This was the original 3rd angle design for the poker chips. Before I decided to move to image cut outs, I considered displaying the chip value in braille. This design was ultimately abandoned due to the requirement of braille literacy in users and for stackability of chips.',
            },
          ],
        },
      },
    ],
  },

 {
  id: 'physical-projects',
  label: 'Physical Projects',
  attachIndex: 2,
  items: [
    {
      glb: 'models/object-project-rfid.glb',
      seat: 'right',
      positionOffset: [
        -0.6,
        0,
        -4.1,
      ],
      scale: 1,
      rotationY: -1,
      label: 'RFID Remote Authorization Lock Box | Making The Modern World 2026 Design Conference',
      description: 'I built this lock box as a smarter alternative to my college\'s lost and found system for low-to-medium value items. Rather than relying on staff to manually match owners to items, the box integrates directly with the school\'s existing ID infrastructure. When someone is confirmed as the owner of a lost item, I designed the system to remotely authorize their student ID to unlock the box and retrieve it on their own time.\n\nThe system runs C++ firmware I wrote for an Arduino Nano, which controls a 5V solenoid lock through a MOSFET switching circuit and communicates with a 13.56MHz RC522 RFID reader over SPI. I handled the card authorization logic and hardware control timing entirely on-device. The custom electronics I wired include flyback protection, gate pull-down resistors, and multi-voltage power distribution (5V/3.3V) for reliable high-current switching.\n\nI CAD modeled and 3D-printed a thermal housing for the solenoid to ensure precise actuation alignment and protect nearby components from heat. I also fabricated the enclosure itself—a 19" × 14" × 5" wooden box—using a table saw, adding full cable management and strain relief for a production-quality finish.',
      skills: [
        'cpp',
        'arduino',
        'circuits',
        'rfid-nfc',
        'soldering',
        'woodworking',
        '3d-printing',
        'fusion-360',
        'problem-solving',
      ],
      pdfExport: {
        hardware: 'flagship',
        software: true,
        all: 'flagship',
      },
      pdfSummary: 'I built this lock box as a smarter alternative to my college\'s lost and found system for low-to-medium value items. Rather than relying on staff to manually match owners to items, the box integrates directly with the school\'s existing ID infrastructure. When someone is confirmed as the owner of a lost item, I designed the system to remotely authorize their student ID to unlock the box and retrieve it on their own time.',
      problem: 'At Boston College, the current lost and found system relies on medium-to-high value items being submitted to the sole pick-up location located in the Boston College Police Department on Lower Campus where students can pick up their items upon proof of ownership and/or identification. The pain point of this system is two-fold: it doesn\'t account for items with low material value but high sentimental value, and it places an unnecessary burden on an overstressed system, namely the police station of a college campus.',
      outcome: 'The project was presented at the Making the Modern World 2026 design conference. It functioned as intended. For the purposes of demonstration, I had attendees use a practice Eagle ID which had been registered as an authorized user prior to the event to open the lock box and retrieve a faux lost item. In the user feedback stage of testing, there was an average user satisfaction level of 9.875/10 across 16 users. ',
      contribution: 'The system runs C++ firmware I wrote for an Arduino Nano, which, using card authorization logic, controls a 5V solenoid lock through a MOSFET switching circuit and communicates with a 13.56MHz RC522 RFID reader over SPI. The custom electronics I wired include flyback protection, gate pull-down resistors, and multi-voltage power distribution (5V/3.3V) for reliable high-current switching.',
      lessons: 'I learned the importance of planning out the electronic housing prior to assembling the final enclosure.',
      images: [
        {
          src: 'photos/rfid-0.jpg',
          date: '11/21/2025',
        },
        {
          src: 'photos/rfid-1.jpg',
          date: '11/21/2025',
        },
        {
          src: 'photos/rfid-2.jpg',
          date: '11/18/2025',
        },
        {
          src: 'photos/rfid-3.jpg',
          date: '11/19/2025',
        },
      ],
      technicalDoc: {
        size: 'md',
        pdfSkip: {
          software: true,
        },
        docs: [
          {
            src: 'photos/schematics/rfid.png',
            stage: 'DOCUMENTATION',
            caption: 'This KiCAD circuit diagram shows the connections between the Arduino Nano Connect, MOSFET (IRLZ44N), flyback diode (1N4007), and RFID reader (RC522) used in the construction of the lockbox.',
          },
        ],
      },
    },
    {
      glb: 'models/object-project-arcade.glb',
      seat: 'right',
      positionOffset: [
        0.5,
        0,
        0.2,
      ],
      scale: 2,
      rotationY: -1.55,
      label: 'Dino Metal Rampage',
      description: 'I engineered and fabricated a fully custom hard rock dinosaur-themed arcade cabinet, which I laser-cut with dino designs and finished with a clear acrylic back panel so the interior circuitry is visible.\n\nI powered the hardware with a Raspberry Pi 5 and an Adafruit RGB Matrix HAT, driving three 64×32 HUB75 LED panels as a single 96×64 display. I hand-wired and soldered all circuitry components, mapping seven physical buttons and a joystick directly to the software input layer while utilizing two external power supplies to handle the Pi and panels separately.\n\nI wrote the entire software stack from scratch: five games (Coloring Book, Maze, Meteorite Massacre, Cretaceous Shred: Rex\'s Revenge, and Blackjack), a scrolling game-select launcher, a universal high score system, and per-session coloring book storage with email delivery. I also built a custom sprite extraction tool that pulls from sprite sheets and converts them into the flat .txt format the LED matrix consumes, as well as an offline MIDI analysis pipeline for Rex\'s Revenge that auto-generates note charts from audio using beat tracking, onset detection, and spectral band mapping.\n\nI collaborated with Garrett Mackenzie, who constructed and spray-painted the wooden physical enclosure. I built this project for our Physical Computing Class at Boston College.',
      skills: [
        'python',
        'raspberry-pi',
        'led-matrix',
        'soldering',
        'laser-cutting',
        'machine-learning',
        'prompt-engineering',
        'teamwork',
        'problem-solving',
      ],
      pdfExport: {
        hardware: 'flagship',
        software: 'flagship',
        all: 'flagship',
      },
      pdfSummary: 'I engineered a custom arcade machine, "Dino Metal Rampage", with five games: Cretaceous Shred: Rex\'s Revenge (a guitar hero spoof), Asteroid Avoider, a character selection game to avoid falling asteroids, a BlackJack display with an animated raptor bartender/dealer, a coloring book with 20 different coloring pages, and a maze game with a maze generation algorithm. \n\n',
      problem: 'This project was constructed in combination with Garrett Mackenzie for my final project in my Physical Computer class at Boston College. For this project, we were given two weeks and a maximum budget of $200 to create an interactive display that incorporated light and movement.  ',
      outcome: 'The display ran smoothly and worked for all five games with active communication between the controls and Hub75s. The head of the engineering department at Boston College and our Physical Computing professor requested to display the piece at the front entrance of 245 Beacon Street, Boston College\'s engineering building, for the remainder of my study to promote the caliber of the engineering program at our university. ',
      contribution: 'For my portion of the project, I integrated a Raspberry Pi 5, Adafruit RGB Matrix HAT, seven LED 3.3V buttons, a four-direction joystick, and three 64×32 HUB75 LED panels into a unified 96×64 low‑latency display, with hand‑wired controls and dual‑rail power distribution for stable high‑current operation. I also programmed a five-game game engine, an offline MIDI/audio analysis engine, a PNG sprite‑sheet extractor with per‑pixel color quantization, sprite blitting routines, and a persistent high‑score subsystem.',
      lessons: 'I learned the importance of testing electrical components prior to implementing them into my final builds.',
      images: [
        {
          src: 'photos/arcade-1.jpg',
          date: '05/10/2026',
        },
        {
          src: 'photos/arcade-2.jpg',
          date: '04/13/2026',
        },
        {
          src: 'photos/arcade-3.jpg',
          date: '04/9/2026',
        },
      ],
      technicalDoc: {
        size: 'md',
        docs: [
          {
            src: 'photos/schematics/arcade_system_block_diagram.jpg',
            stage: 'DOCUMENTATION',
            caption: 'This is a system block diagram of Dino Metal Rampage. It shows the connections between input, control, power, and conversion components. It also includes the plans for a Raspberry Pi Pico audio management system which is a planned addition.',
          },
        ],
      },
    },
    {
      glb: 'models/object-project-math.glb',
      seat: 'left',
      positionOffset: [
        0,
        0,
        -2.9,
      ],
      scale: 1,
      rotationY: 1.35,
      label: 'Portable Counting Game | Exemplary Build Award',
      description: 'I developed a portable counting game designed for children with combined physical and cognitive impairments, purposefully sizing it to fit directly on a wheelchair tray for independent use.\n\nI designed the device to run on a rechargeable battery while retaining plug-in capabilities to ensure uninterrupted sessions. I reduced the interaction to two large buttons, making it accessible to children with limited fine motor control, and added a glass light diffuser above the indicator to soften visual feedback.\n\nI soldered and assembled the internal circuitry (a Matrix Portal connected to a HUB75 and mobile battery) and designed the logic controlling the code behind the counting game.\n\nI built this in conjunction with Garrett Mackenzie for our Physical Computing class at Boston College.',
      skills: [
        'circuitpython',
        'led-matrix',
        'soldering',
        'teamwork',
        'problem-solving',
        'communication',
      ],
      pdfExport: {
        hardware: true,
        software: false,
        all: true,
      },
      images: [
        {
          src: 'photos/math-game-1.jpg',
          date: '04/29/2026',
        },
      ],
    },
    {
      glb: 'models/object-project-tapn.glb',
      seat: 'left',
      positionOffset: [
        -0.4,
        0.2,
        0.7,
      ],
      scale: 1,
      label: 'TapN | Accelerate@Shea 2026 Cohort',
      description: 'I co-founded TapN, an NFC-based system designed to reduce student phones to only their essential functions during class, minimizing distraction while preserving safety features.\n\nI led the hardware design through multiple iterations, building wooden physical mockups, CAD models, and 3D-printed prototypes. I also built object-oriented frameworks in Swift to optimize the tap-to-restrict user flow.\n\nBecause of our work, TapN was selected for Accelerate@Shea 2026, a competitive startup accelerator at Boston College offering equity-free funding, mentorship, and workshops with industry professionals.',
      skills: [
        'swift',
        'fusion-360',
        'cad',
        '3d-printing',
        'entrepreneurship',
        'leadership',
        'communication',
        'teamwork',
      ],
      pdfExport: {
        hardware: false,
        software: true,
        all: true,
      },
      images: [
        {
          src: 'photos/tapn-2.jpg',
          date: '02/17/2026',
        },
      ],
    },
    {
      glb: 'models/object-project-cat-bed.glb',
      seat: 'right',
      positionOffset: [
        -0.4,
        0.8,
        -3.6,
      ],
      scale: 3,
      rotationY: 5.4,
      label: 'Keypad-Controlled Vibrating Cat Bed | 2nd Place — Boston College Make-A-Thon 2026',
      description: 'I designed this vibrating cat bed for deaf cats who can no longer experience music audibly, engineering it to deliver calming sensory stimulation through touch. I integrated a wired 4×4 keypad so the owner can easily adjust the bed\'s settings without disturbing a resting pet.\n\nI built the electronics around an Elegoo Uno paired with a CircuitPython Bluefruit, which I programmed to drive a connected speaker and amplifier via PWM signals. I wired five vibration motors through a shared common ground and power line, regulating their intensity with a MOSFET. I mapped the 4×4 keypad to give the user direct control over three functions: power on/off, vibration intensity, and playback of one of three songs, each of which I coded to be felt as rhythmic vibration through the bed\'s surface.',
      skills: [
        'arduino',
        'circuitpython',
        'circuits',
        'pwm',
        'motors',
        'soldering',
        'problem-solving',
      ],
      pdfExport: {
        hardware: true,
        all: true,
      },
      images: [
        {
          src: 'photos/cat-bed-0.jpg',
          date: '03/21/2026',
        },
        {
          src: 'photos/cat-bed-1.jpg',
          date: '03/22/2026',
        },
        {
          src: 'photos/cat-bed-2.jpg',
          date: '03/22/2026',
        },
        {
          src: 'photos/cat-bed-3.jpg',
          date: '03/22/2026',
        },
        {
          src: 'photos/cat-bed-4.jpg',
          date: '03/21/2026',
        },
      ],
    },
    {
      glb: 'models/object-project-hay-bag.glb',
      seat: 'left',
      positionOffset: [
        0.2,
        0,
        1.8,
      ],
      scale: 1,
      rotationY: 1.7,
      label: 'Mobile Hay-Bag Shelf | Lovelane Special Needs Horseback Riding Program — Boston College Engineering Project',
      description: 'I co-designed and constructed this mobile shelf in collaboration with the Lovelane Special Needs Horseback Riding Program to help students with disabilities independently participate in horse feeding. By holding a hay bag at a consistent two-foot height, the shelf I helped design frees the student to focus on the clasping mechanism without needing to support the bag\'s weight.\n\nMy team and I constructed the shelf from plywood using piano hinges, allowing it to fold down to less than a third of its original width for easy storage and transport. I contributed to adding adjustable hooks for flexible bag placement and laser-engraving horse designs on the side panels for visual detail. We ensured the final build safely supports over 25 lbs and requires no fine-motor manipulation to operate.\n\n*Built in collaboration with Karilynn Arellano, Kaitlyn Cabalu, and Burke Bessette.*',
      skills: [
        'woodworking',
        'laser-cutting',
        'hand-tools',
        'teamwork',
        'communication',
        'problem-solving',
      ],
      pdfExport: {
        hardware: 'flagship',
        all: 'flagship' ,
      },
      pdfSummary: 'I co-designed and constructed this mobile shelf in collaboration with the Lovelane Special Needs Horseback Riding Program, Karilynn Arellano, Kaitlyn Cabalu, and Burke Bessette to help students with disabilities independently participate in horse feeding. By holding a hay bag at a consistent two-foot height, the shelf I helped design frees the student to focus on the clasping mechanism without needing to support the bag\'s weight.',
      problem: 'The Lovelane Special Needs Horseback Riding Program allows students of all conditions to help care for and ride horses. One caretaking activity is feeding the horses by hanging a hay bag at a height of approximately two feet from the ground. The process prior to the implementation of our solution was for the person hanging the bag to carry and push their entire body weight against the bag while simultaneously facilitating the bag\'s clasps. Our targeted user was someone with difficulties with fine muscle coordination. ',  
      outcome: 'Our final design allowed the bag to be placed at a height below the two-foot range such that regardless of the different physical abilities of users, the bag will sit at the same height with no fine motor manipulation required to hold the bag in place. Additionally, the design was easily mobile and storable with a weight of 12.5lbs and a moveable hook design which allowed tension cables to be used as our storage mechanism to compress the width of the shelf to less than a third of its original width. ',
      contribution: 'I designed and produced the sketches for our initial and final prototype, which I then iterated on with my teammates. I also did the math substantiating the size constraints of our final design. Additionally, I completed the majority of the physical construction including fabricating the wooden backing and floor, attaching a piano hinge, tension cables, and hooks for portability, and laser cutting paneling for our nail heads to prevent snagging and improve the overall aesthetics of our design. \n',
      lessons: 'Designing an effective build with an intuitive interface is often better than a more complicated, ostensibly \'technically advanced\' build that may isolate the targeted user.',
      images: [
        {
          src: 'photos/hay-bag-1.jpg',
          date: '05/01/2026',
          pdfSkipImage: true,
        },
        {
          src: 'photos/hay-bag-2.jpg',
          date: '04/29/2026',
        },
      ],
      technicalDoc: {
        size: 'md',
        docs: [
          {
            src: 'photos/schematics/math-hay.jpg',
            stage: 'PLANNING',
            caption: 'One of our goals in the shelf construction was minimizing weight while allotting space for the majority of hay-bags to be hung, thus we wanted to be precise with the amount of space we dedicated to the flooring of our shelf. Since we had a set width to accommodate the stall dimensions, I decided to calculate the length our flooring would need to extend to in order to fit most hay bags. This is the write up of the math I did to justify our dimensions for the floor of the hay bag.',          },
        ],
      },
    },
  ],
},

  {
    id: 'events',
    label: 'Events',
    attachIndex: 4,
    items: [
      {
        "glb": "models/openDots.glb",
        "seat": "left",
        "positionOffset": [-0.4, 0.5, 0.6],
        "scale": 11.5,
        "label": "OpenDots | Babson Hackathon 2026",
        "link": "https://github.com/romanobro56/OpenDots",
        "description": "I built the full Fusion 360 model for a digital Braille‑style display during Babson University’s 2026 five‑hour hackathon. Each body in the model was intentionally named so our code could address individual pins in real time. When a user pressed a letter on our website, a teammate’s image‑analysis algorithm recognized the character and triggered the corresponding pins in the 3D model, creating a live, interactive Braille output experience designed to support early literacy for blind children. More details are available in the linked GitHub repository.",
        "images": [{"src": "photos/Open-dots.jpg", "date": '04/11/2026'},{"src": "photos/open-dots-2.jpg", "date": '04/11/2026'},{"src": "photos/open-dots-3.jpg", "date": '04/11/2026'}],
        "skills": ['fusion-360', 'cad', 'teamwork', 'problem-solving']
      },
      {
        "glb": "models/object-project-rfid.glb",
        "seat": "right",
        "positionOffset": [-0.6, 0, -4.1],
        "scale": 1,
        "label": "RFID Remote Authorization Lock Box | Making The Modern World 2026 Design Conference",
        "link": null,
        "description": "I built this lock box as a smarter alternative to my college's lost and found system for low-to-medium value items. Rather than relying on staff to manually match owners to items, the box integrates directly with the school's existing ID infrastructure. When someone is confirmed as the owner of a lost item, I designed the system to remotely authorize their student ID to unlock the box and retrieve it on their own time.\n\nThe system runs C++ firmware I wrote for an Arduino Nano, which controls a 5V solenoid lock through a MOSFET switching circuit and communicates with a 13.56MHz RC522 RFID reader over SPI. I handled the card authorization logic and hardware control timing entirely on-device. The custom electronics I wired include flyback protection, gate pull-down resistors, and multi-voltage power distribution (5V/3.3V) for reliable high-current switching.\n\nI CAD modeled and 3D-printed a thermal housing for the solenoid to ensure precise actuation alignment and protect nearby components from heat. I also fabricated the enclosure itself—a 19\" × 14\" × 5\" wooden box—using a table saw, adding full cable management and strain relief for a production-quality finish.",
        "images": [{"src": "photos/rfid-0.jpg", "date": '11/21/2025'},{"src": "photos/rfid-1.jpg", "date": '11/21/2025'},{"src": "photos/rfid-2.jpg", "date": '11/18/2025'},{"src": "photos/rfid-3.jpg", "date": '11/19/2025'}],
        "rotationY": -1,
        "skills": ['cpp', 'arduino', 'circuits', 'rfid-nfc', 'soldering', 'woodworking', '3d-printing', 'fusion-360', 'problem-solving']
      },
      {
        "glb": "models/object-project-math.glb",
        "seat": "left",
        "positionOffset": [0, 0, -2.9],
        "scale": 1,
        "label": "Portable Counting Game | Exemplary Build Award",
        "link": null,
        "description": "I developed a portable counting game designed for children with combined physical and cognitive impairments, purposefully sizing it to fit directly on a wheelchair tray for independent use.\n\nI designed the device to run on a rechargeable battery while retaining plug-in capabilities to ensure uninterrupted sessions. I reduced the interaction to two large buttons, making it accessible to children with limited fine motor control, and added a glass light diffuser above the indicator to soften visual feedback.\n\nI soldered and assembled the internal circuitry (a Matrix Portal connected to a HUB75 and mobile battery) and designed the logic controlling the code behind the counting game.\n\nI built this in conjunction with Garrett Mackenzie for our Physical Computing class at Boston College.",
        "images": [{"src": "photos/math-game-1.jpg", "date": '04/29/2026'}],
        "rotationY": 1.35,
        "skills": ['circuitpython', 'led-matrix', 'soldering', 'teamwork', 'problem-solving', 'communication']
      },
      {
        "glb": "models/object-project-tapn.glb",
        "seat": "left",
        "positionOffset": [-0.4, 0.2, 0.7],
        "scale": 1,
        "label": "TapN | Accelerate@Shea 2026 Cohort",
        "link": null,
        "description": "I co-founded TapN, an NFC-based system designed to reduce student phones to only their essential functions during class, minimizing distraction while preserving safety features.\n\nI led the hardware design through multiple iterations, building wooden physical mockups, CAD models, and 3D-printed prototypes. I also built object-oriented frameworks in Swift to optimize the tap-to-restrict user flow. When a student enters the classroom, they tap their phone to a physical NFC device which sends a notification to a paired application which restricts all apps not included on a by-school whitelist. This allows for communication tools in times of emergency while simultaneously preventing classroom disruption.\n\nBecause of our work, TapN was selected for Accelerate@Shea 2026, a competitive startup accelerator at Boston College offering equity-free funding, mentorship, and workshops with industry professionals.",
        "images": [{"src": "photos/tapn-2.jpg", "date": '02/17/2026'}],
        "skills": ['swift', 'fusion-360', 'cad', '3d-printing', 'entrepreneurship', 'leadership', 'communication', 'teamwork']
      },
      {
        "glb": "models/object-project-cat-bed.glb",
        "seat": "right",
        "positionOffset": [-0.4, 0.8, -3.6],
        "scale": 3,
        "label": "Keypad-Controlled Vibrating Cat Bed | 2nd Place — Boston College Make-A-Thon 2026",
        "link": null,
        "description": "I designed this vibrating cat bed for deaf cats who can no longer experience music audibly, engineering it to deliver calming sensory stimulation through touch. I integrated a wired 4×4 keypad so the owner can easily adjust the bed's settings without disturbing a resting pet.\n\nI built the electronics around an Elegoo Uno paired with a CircuitPython Bluefruit, which I programmed to drive a connected speaker and amplifier via PWM signals. I wired five vibration motors through a shared common ground and power line, regulating their intensity with a MOSFET. I mapped the 4×4 keypad to give the user direct control over three functions: power on/off, vibration intensity, and playback of one of three songs, each of which I coded to be felt as rhythmic vibration through the bed's surface.",
        "images": [{"src": "photos/cat-bed-0.jpg", "date": '03/21/2026'},{"src": "photos/cat-bed-1.jpg", "date": '03/22/2026'},{"src": "photos/cat-bed-2.jpg", "date": '03/22/2026'},{"src": "photos/cat-bed-3.jpg", "date": '03/22/2026'},{"src": "photos/cat-bed-4.jpg", "date": '03/21/2026'}],
        "rotationY": 5.4,
        "skills": ['arduino', 'circuitpython', 'circuits', 'pwm', 'motors', 'soldering', 'problem-solving']
      }
    ]
  },
  {
    id: 'about-me',
    label: 'About Me',
    attachIndex: 6,
    items: [
        {
          "glb": "models/linkedIn.glb",
          "seat": "left",
          "positionOffset": [-0.2, -0.1, 2.4],
          "scale": 10,
          "label": "LinkedIn",
          "link": "https://www.linkedin.com/in/sarah-bland-808405357/",
          "description": null,
          "images": [],
          "rotationY": 0.15
        },
        {
          "glb": "models/gmail.glb",
          "seat": "left",
          "positionOffset": [-0.1, -0.1, 1.2],
          "scale": 10,
          "label": "Gmail",
          "link": "mailto:blandsa@bc.edu",
          "description": null,
          "images": [],
          "rotationY": -0.2
        },
        {
          "glb": "models/about-chinese.glb",
          "seat": "right",
          "positionOffset": [-0.9, 0, 1.6],
          "scale": 1.5,
          "label": "Chinese Immersion Learner",
          "link": null,
          "description": "I have been learning Mandarin for 15 years. I was enrolled in a Chinese immersion program through middle school, which included accelerated math and competing in Mandarin speech competitions at UMD. In high school, I wrote and performed a short play in Mandarin about cultural appropriation alongside my friend Kevin Ma — it headlined our school's Lunar New Year celebration. I later visited my pen pal in Beijing, a trip that deepened the connection the language has always given me to the world beyond my own.",
          "images": [{"src": "photos/chinese-1.jpg", "date": '02/06/2024'}],
          "rotationY": -2.1,
          "skills": ['communication', 'public-speaking','teamwork']
        },
        {
          "glb": "models/gingerbread.glb",
          "seat": "right",
          "positionOffset": [
            1.1,
            0,
            -0.5
          ],
          "scale": 1,
          "label": "MakeBC Officer",
          "link": null,
          "description": "As an officer for MakeBC, Boston College's premier make and design club, I help scale our club and execute event management and preparation. For instance, this year, I built metal pumpkin trophies for our Punkin' Chunkin' event, organized inventory management for our annual Make-A-Thon, and grew our member base by over 30%. Additionally, I provided tool assistance, photography, and general set-up/clean-up for our annual programming. As a club member, I (successfully) completed an egg drop off a 7 story building, launched a pumpkin 40 some odd feet, and won second place in our independently judged 24-hour Make-A-Thon.",
          "images": [{"src": "photos/makebc-1.jpg", "date": '12/02/2025'},{"src": "photos/makebc-2.jpg", "date": '11/22/2025'}],
          "rotationY": -1.8,
          "skills": ['teamwork', 'problem-solving', 'event-planning','communication']
        },
        {
                
          "glb": "models/cup.glb",
          "seat": "right",
          "positionOffset": [
            -0.3,
            2.6,
            -3
          ],
          "scale": 0.1,
          "label": "Society Of Women Engineers at Boston College Co-director of Community Service",
          "link": null,
          "description": "As Co‑director of Community Service for SWE, I have coordinated early planning for our 2026–2027 outreach initiatives, including researching nearby organizations that work to increase access for women returning to STEM education. This year, I attended the National SWE Conference of 2025 in New Orleans. While there, I was fortunate to hear about the initiatives being put in place by female engineers across the globe, and I was especially interested in the recent push in assistive technology and custom prostheses. It was an incredible experience. I returned with concrete career readiness strategies from industry professionals that our chapter is already integrating into our preparations for next year’s conference.",
          "images": [{"src": "photos/swe-1.jpg", "date": '10/25/2025'}],
          "rotationY": -2.3,
          "skills": ['leadership', 'event-planning', 'teamwork', 'communication']
        },
        {
          "glb": "models/about-house.glb",
          "seat": "left",
          "positionOffset": [-1.5, 0, 1.2],
          "scale": 0.28,
          "label": "Where I'm Located",
          "link": null,
          "description": "I am originally from Maryland. My preferred work locations are New York, Los Angeles, Boston, and Washington, D.C.",
          "images": [{"src": "photos/crab.jpg", "date": null}],
          "rotationY": -1
        },
        {
          "glb": "models/about-tv.glb",
          "seat": "right",
          "positionOffset": [-1.1, 0.1, -3.2],
          "scale": 0.51,
          "label": "Certified Cinephile",
          "link": null,
          "description": "I have seen over a thousand movies and wrote a screenplay at 18. Every Wednesday I watch a film with friends — a ritual I look forward to every week. Some of my favorites are 'The Half of It', 'Perfect Days', 'Scream', 'Godzilla Minus One', 'The Pig, The Snake and the Pigeon', and 'Who Framed Roger Rabbit'. On the TV side, 'Interior Chinatown' is a recent standout. Beyond film, I am a serious sports fan — football, hockey, and basketball are fixtures in my viewing life.",
          "images": [{"src": "photos/movies-1.jpg", "date": '04/04/2026'}],
          "rotationY": -2
        },
        {
          "glb": "models/about-water.glb",
          "seat": "left",
          "positionOffset": [0.8, 0.2, -1.6],
          "scale": 0.5,
          "label": "My Interests",
          "link": null,
          "description": "I enjoy learning about a wide variety of subjects. Topics in which I maintain a strong body of knowledge include the Flint, Michigan water crisis and community vulnerability to public health crises, entertainment engineering techniques, the long-term effects of redlining on modern housing districts, the intersection between religion and economic theory, and asylum law regulations and procedures.",
          "images": [{"src": "photos/water.jpg", "date": null}]
        },
        {
          "glb": "models/about-cooking.glb",
          "seat": "left",
          "positionOffset": [0.9, -1.1, -4.5],
          "scale": 0.4,
          "label": "Red-Meat Cooking Prodigy",
          "link": null,
          "description": "I can make a mean steak—and that is an understatement. I love cooking for family and friends. While I usually take requests, my favorite secret recipes include sugar fish fillet, hidden-vegetable pumpkin buns, popsicle-poached apples, and onion-tomato seared steak. Recipes are available upon request.",
          "images": [{"src": "photos/cooking-0.jpg", "date": null},{"src": "photos/cooking-1.jpg", "date": null}],
          "rotationY": -0.012
        },
        {
          "glb": "models/about-boxing.glb",
          "seat": "left",
          "positionOffset": [-1.3, 0, 4.2],
          "scale": 0.2,
          "label": "Former Pre-Amateur Boxer",
          "link": null,
          "description": "I boxed all four years of high school and was one of two girls on a boxing team in White Flint, Maryland. My coach was an old-fashioned 'tough-love' mentor who taught me about delayed gratification, discipline, and punctuality. My favorite moment from the sport was participating in a gym-run Punch-A-Thon to help bring boxing to impoverished youth.",
          "images": [{"src": "photos/boxing.jpg", "date": '10/13/2023'}],
          "rotationY": 0.45
        }
      ]
    },
  {
    id: 'more-stuff',
    label: 'Coming Soon',
    attachIndex: 10,
    items: [
      //Cutting board, book, screenplay, pumpkin trophies, pubkin trebuchet
    ]
  }
  
]

// ── WHEEL SETTINGS ──────────────────────────────────────────
export const WHEEL = {
  spinSpeed: 0.0015,
  selectSpeedBoost: 0.08,
  easeInDistance: 0.3,
  totalAttachPoints: 12,
  cabinHangOffset: [0,-0.8,0],  // how far cabin hangs below attach point
}

// ── CAMERA SETTINGS ─────────────────────────────────────────
export const CAMERA = {
  startPosition: [8, -104, 200],   // initial camera position
  minDistance:    60,             // orbit min zoom
  maxDistance:    500,            // orbit max zoom
  interiorOffset: [0, 7, 4],      // camera offset inside cabin [x, y, z]
  interiorLookOffset: [0, 4, -6], // where camera looks inside cabin
  exitPosition:  [8, -104, 200],
}

// ── CABIN SWAY SETTINGS ─────────────────────────────────────
export const SWAY = {
  noiseScale: 0.4,            // how much noise affects sway
  pendulumStrength: 0.6,      // how much wheel speed affects sway
  maxAngle: 0.08,             // max sway in radians (~4.5 degrees)
  damping: 0.92,              // how quickly sway settles
}

// ── FOG SETTINGS ────────────────────────────────────────────
export const FOG = {
  groundParticleCount: 800,
  groundHeight: -7 * 14.29,    // scaled ground level
  upperOpacity: 0.006,
  driftSpeed: 0.004,           // faster drift to be visible at scale
  color: '#d4c5e8',
  spread: 40 * 14.29,          // how wide fog spreads
}

// ── LIGHTING ────────────────────────────────────────────────
export const LIGHTS = {
  ambientColor:    '#1a0a2e',
  ambientIntensity: 0.4,

  moonColor:       '#a8c8ff',
  moonIntensity:   0.8,
  moonPosition:    [-140, 280, 110],  // scaled moon position

  warmFillColor:   '#ffb347',
  warmFillIntensity: 0.3,
  warmFillDistance: 25 * 14.29,       // point light radius

  rimColor:        '#a8c8ff',
  rimIntensity:    1.2,
  attachLightRadius: 3 * 14.29,       // radius of attach point lights
}

// ── MATERIAL COLORS ─────────────────────────────────────────
export const MATERIALS = {
  // Cabin
  cabin_body:           { color: '#f5f0e8', metalness: 0.0, roughness: 0.7 },
  cabin_trim:           { color: '#c9a84c', metalness: 0.9, roughness: 0.2,  emissive: '#c9a84c', emissiveIntensity: 0.4 },
  cabin_trim_window_ext:{ color: '#f5f0e8', metalness: 0.0, roughness: 0.7 },
  cabin_trim_window_int:{ color: '#f0e6cc', metalness: 0.1, roughness: 0.6,  emissive: '#f0e6cc', emissiveIntensity: 0.08 },
  cabin_window:         { color: '#ffffff', metalness: 0.0, roughness: 0.0,  transparent: true, opacity: 0.15 },
  cabin_door_body:      { color: '#f5f0e8', metalness: 0.0, roughness: 0.7 },
  cabin_door_trim:      { color: '#c9a84c', metalness: 0.9, roughness: 0.2,  emissive: '#c9a84c', emissiveIntensity: 0.4 },
  cabin_door_trim_red:  { color: '#8b1a1a', metalness: 0.0, roughness: 0.8 },
  cabin_door_base:      { color: '#1a1a1a', metalness: 0.2, roughness: 0.9 },
  cabin_door_handle:    { color: '#c9a84c', metalness: 0.9, roughness: 0.2,  emissive: '#c9a84c', emissiveIntensity: 0.3 },
  cabin_door_bar:       { color: '#8b7536', metalness: 0.7, roughness: 0.75, emissive: '#3d3218', emissiveIntensity: 0.1 },
  cabin_seat:           { color: '#8b1a1a', metalness: 0.0, roughness: 0.9 },
  cabin_roof:           { color: '#b8960c', metalness: 0.8, roughness: 0.3,  emissive: '#7a6408', emissiveIntensity: 0.15 },
  cabin_floor:          { color: '#2a2a2a', metalness: 0.1, roughness: 0.95 },
  cabin_hook:           { color: '#4a4a4a', metalness: 0.9, roughness: 0.4 },

  // Wheel
  wheel_body:           { color: '#2a2a2a', metalness: 0.9, roughness: 0.4 },
  wheel_rim_front:      { color: '#a8c8ff', metalness: 0.6, roughness: 0.2,  emissive: '#a8c8ff', emissiveIntensity: 0.6 },
  attach_bar:           { color: '#8b7536', metalness: 0.7, roughness: 0.75, emissive: '#3d3218', emissiveIntensity: 0.1 },

  // Stand
  stand_body:           { color: '#1a1a1a', metalness: 0.8, roughness: 0.6 },
  stand_axle:           { color: '#1a1a1a', metalness: 0.9, roughness: 0.3 },

  // Booth stripes — alternating dark metallic purple / deep maroon
  booth_stripe_a:       { color: '#ec500d', metalness: 0.85, roughness: 0.25 }, // dark regal purple
  booth_stripe_b:       { color: '#ffffff', metalness: 0.15, roughness: 0.75 }, // deep maroon accent
}

// ── SKILLS REGISTRY ─────────────────────────────────────────
// Used by SkillsGallery.js to render the shooting-gallery wall.
// Each key matches a slug used in the  skills: [...]  arrays above.
//   label:    display name shown in the detail card
//   category: hardware | coding | design | fabrication | soft
//   level:    1 (beginner) → 5 (expert) — controls object size
export const SKILLS = {

  // ── Hardware & Electronics  →  tin cans ─────────────────
  'arduino':          { label: 'Arduino',              category: 'hardware',    level: 4 },
  'raspberry-pi':     { label: 'Raspberry Pi',         category: 'hardware',    level: 3 },
  'soldering':        { label: 'Soldering',            category: 'hardware',    level: 5 },
  'circuits':         { label: 'Circuit Design',       category: 'hardware',    level: 4 },
  'rfid-nfc':         { label: 'RFID / NFC',           category: 'hardware',    level: 3 },
  'led-matrix':       { label: 'LED Matrix',           category: 'hardware',    level: 3 },
  'motors':           { label: 'Motors & Actuators',   category: 'hardware',    level: 3 },
  'pwm':              { label: 'PWM Signals',          category: 'hardware',    level: 2 },

  // ── Software & Code  →  milk bottles ────────────────────
  'cpp':              { label: 'C++',                  category: 'coding',      level: 4 },
  'python':           { label: 'Python',               category: 'coding',      level: 4 },
  'javascript':       { label: 'JavaScript',           category: 'coding',      level: 4 },
  'swift':            { label: 'Swift',                category: 'coding',      level: 3 },
  'circuitpython':    { label: 'CircuitPython',        category: 'coding',      level: 3 },
  'threejs':          { label: 'Three.js',             category: 'coding',      level: 3 },
  'machine-learning': { label: 'Machine Learning',     category: 'coding',      level: 2 },
  'web-dev':          { label: 'Web Dev',              category: 'coding',      level: 3 },
  'prompt-engineering': { label: 'Prompt Engineering', category: 'coding',      level: 3 },

  // ── Design & 3D  →  rubber ducks ────────────────────────
  'fusion-360':       { label: 'Fusion 360',           category: 'design',      level: 5 },
  'blender':          { label: 'Blender',              category: 'design',      level: 4 },
  'cad':              { label: '3D CAD',               category: 'design',      level: 5 },
  'ui-design':        { label: 'UI Design',            category: 'design',      level: 3 },

  // ── Fabrication & Making  →  bullseye targets ───────────
  '3d-printing':      { label: '3D Printing',          category: 'fabrication', level: 4 },
  'woodworking':      { label: 'Woodworking',          category: 'fabrication', level: 3 },
  'laser-cutting':    { label: 'Laser Cutting',        category: 'fabrication', level: 3 },
  'hand-tools':       { label: 'Hand Tools',           category: 'fabrication', level: 2 },

  // ── Soft Skills  →  balloons ─────────────────────────────
  'teamwork':         { label: 'Teamwork',             category: 'soft',        level: 5 },
  'communication':    { label: 'Communication',        category: 'soft',        level: 4 },
  'problem-solving':  { label: 'Problem Solving',      category: 'soft',        level: 5 },
  'entrepreneurship': { label: 'Entrepreneurship',     category: 'soft',        level: 3 },
  'leadership':       { label: 'Leadership',           category: 'soft',        level: 3 },
  'event-planning':   { label: 'Event Planning',       category: 'soft',        level: 3 },
  'public-speaking':  { label: 'Public Speaking',      category: 'soft',        level: 3 },

}
export const ABOUT_ME = {
  photo: 'photos/headshot.jpg',
  bio: [
    // Paragraph 1 — professional intro
    "I am a rising sophomore in Boston College's 2029 Human Centered Engineering cohort. My past work experience includes computational biology research at Rockefeller University, asylum affidavit writing for U.S. applicants, and front-end software development. I would like to join an engineering firm after graduating from Boston College, attend law school, and return to work as in-house counsel. I am particularly interested in working in an innovative field with limited legal precedent. ",
    // Paragraph 2 — mission and context  
    ''
    //'Your second paragraph here. What drives you, where you\'re headed, the thread that connects your work.',
  ],
  education: "Boston College Rising Sophomore",

}