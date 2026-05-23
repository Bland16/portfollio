// ═══════════════════════════════════════════════════════════
// sir-phrases.js — Structured phrase bank
// Each phrase: { id, bucket, topic, text, followups, weight }
// weight: default 1.0, higher = preferred when scoring is tied
// followups: suggested visitor buttons after this response
// ═══════════════════════════════════════════════════════════


// ── KEYWORD MAP — topics → trigger words ─────────────────
// Multi-word keywords are checked against full normalized input
// Single words are matched against individual tokens
export const TOPIC_KEYWORDS = {
  creation_process: ['how did she make', 'how were you made', 'how was this built', 'how did she build', 'how were you built', 'process of making', 'how exactly did she make'],
  name:          ['name', 'call', 'called', 'sir', 'what do i call', 'your name'],
  identity:      ['what are you', 'who are you', 'what exactly', 'robot', 'ghost', 'artificial', 'creature', 'what kind of thing'],
  arms:          ['arms', 'legs', 'hands', 'limbs', 'floating', 'torso', 'no arms', 'no legs', 'body', 'appendage', 'float', 'hover', 'gravity', 'levitate'],
  lonely:        ['lonely', 'alone', 'company', 'miss', 'solitary', 'isolation'],
  happy:         ['happy', 'happiness', 'glad', 'joy', 'content', 'feelings', 'emotions', 'feel', 'pretending'],
  sleep:         ['sleep', 'rest', 'dream', 'dreams', 'wake', 'dormant', 'night'],
  website:       ['website', 'know you are', 'internet', 'browser', 'tab', 'page', 'online'],
  see_visitor:   ['see me', 'can you see', 'watch me', 'look at me', 'see you'],
  why_talk:      ['talk like that', 'speak like', 'why do you talk', 'way you talk', 'how you speak'],
  how_are_you:   ['how are you','how are you doing', 'how is it going', 'how are you feeling'],
  weather:       ['weather', 'hows the weather', 'how is the weather', 'raining', 'sunny'],
  bot_fun:       ['what do you do for fun', 'your hobbies', 'do you have any hobbies', 'you do for fun'],
  sarah_hobbies: ['what does sarah do for fun', 'for fun', 'sarah enjoy', 'sarah hobbies', 'her hobbies', 'does she have any hobbies', 'does she have hobbies', 'she do for fun'],
  sarah_general: ['who is sarah','sarah like','what can you tell me about sarah','maker', 'creator', 'who made', 'who built', 'made you', 'built you'],
  sarah_skills:  ['skills', 'good at', 'qualifications', 'capable', 'abilities', 'expertise', 'what can she do', 'what does she know'],
  sarah_person:  ['like as a person', 'personality', 'what is she like', 'describe her', 'what kind of person', 'what is sarah like'],
  hire:          ['why should i','hire', 'employ', 'give her a job', 'recruit', 'work for', 'give her an internship', 'should i hire'],
  looking:       ['is she looking','internship','job'],
  contact:       ['contact', 'reach', 'email', 'get in touch', 'message', 'linkedin', 'github', 'resume'],
  study:         ['study', 'studying', 'major', 'degree', 'boston college', 'college', 'school', 'university', 'what is she studying'],
  languages:     ['language', 'code in', 'programming language', 'python', 'swift', 'javascript', 'mandarin', 'speak'],
  tools:         ['tools', 'fusion', 'blender', 'cad', 'software', 'arduino', 'solidworks', 'matlab'],
  projects:      ['projects', 'portfolio', 'show me', 'what has she built', 'what has she made', 'work on'],
  tapn:          ['tapn', 'tap n', 'nfc', 'startup', 'phones classroom', 'distraction', 'accelerate', 'school phones'],
  rfid:          ['rfid', 'lockbox', 'lock', 'firmware', 'solenoid', 'microcontroller', 'circuit', 'arduino'],
  trebuchet:     ['trebuchet', 'pumpkin', 'launch', 'catapult', 'competition', 'weirdest', 'strangest', 'odd project'],
  charity:       ['charity', 'dasa', 'bake sale', 'substance abuse', 'donation', 'fundrais', 'tree of hope', 'volunteers'],
  trophies:      ['trophy', 'trophies', 'metal trophy', 'waterjet', 'bandsaw', 'sheet metal', 'cherry wood'],
  window:        ['window', 'see outside', 'view', 'watching', 'look out', 'what can you see'],
  ferris_wheel:  ['ferris', 'wheel', 'spinning', 'ride', 'carts', 'rotate', 'go around'],
  clock:         ['clock', 'time', 'tell time', 'what time', 'watch'],
  eyebrows:      ['eyebrow', 'brow', 'above your head', 'forehead', 'floating eyebrow'],
  itch:          ['itch', 'scratch', 'ear', 'left ear', 'itchy'],
  hay:           ['hay', 'horse', 'shelf', 'hay shelf', 'hay bag'],
  arcade:        ['arcade', 'blackjack', 'poker', 'cards', 'game', 'machine', 'play cards'],
  ticket:        ['ticket', 'buy', 'how much', 'cost', 'price', 'purchase', 'can i buy'],
  outside_world: ['outside', 'real world', 'out there', 'beyond', 'world like', 'abyss', 'dinosaur', 'ocean', 'sky', 'weather', 'flowers', 'what is it like', 'dogs', 'rain', 'smell', 'boxing like', 'movie like'],
  tech_site:     ['three.js', 'threejs', 'webgl', 'how was this built', 'tech stack', 'how is this built', 'how were you made', 'built this site'],
  leave_booth:   ['could you leave', 'can you leave', 'get out', 'escape', 'what would you do', 'if you could leave'],
  proud:         ['proud', 'proudest', 'most proud', 'what are you proud of'],
  love:          ['love', 'what is love', 'do you love', 'know what love is'],
  favorite:      ['favorite', 'favourite', 'best part', 'what do you like most', 'your favorite'],
  bored:         ['bored', 'boring', 'do you get bored', 'pass time'],
  ai:            ['ai', 'artificial intelligence', 'language model', 'gpt', 'chatbot', 'algorithm', 'are you real ai'],
  goodbye:       ['bye', 'goodbye', 'leaving', 'going now', 'exit', 'farewell', 'see you', 'ciao', 'take care', 'got to go'],
  weirdest:      ['weirdest', 'strangest', 'funniest', 'most unusual', 'odd', 'bizarre'],
  wishes:        ['wish you had', 'do you wish', 'if you could have', 'would you want', 'what do you want'],
  more:          ['more', 'tell me more', 'what else', 'another', 'continue', 'go on'],
  mathgame:      ['math game', 'two button', 'campus school', 'cognitive disabilities', 'motor coordination', 'exemplary build', 'physical computing'],
  arcade_machine:['arcade machine', 'arcade', 'she built an arcade', 'physical computing', 'from scratch'],
  catbed:        ['cat bed', 'deaf cats', 'vibrating', 'makeathon', 'cats feel music'],
  poker:         ['poker chips', 'colorblind', 'colour blind', 'color blind', 'poker'],
  rockefeller:   ['rockefeller', 'gene sequencing', 'computational biology', 'new york research', 'summer research'],
  modelun:       ['model un', 'model united nations', 'conference', 'seven hundred', '750'],
  shelf:         ['hay bag shelf', 'loveLane', 'love lane', 'equine therapy', 'motor coordination', 'mobile shelf', 'woodworking laser'],
  treealgo:      ['tree distance', 'tree algorithm', 'distance algorithm', 'ai algorithm', 'unpublished'],
  makeuptray:    ['makeup tray', 'make up tray', 'cad tray', '3d printed tray'],
  eggdrop:       ['egg drop', 'seven stories', 'egg container'],
  weakness:      ['weakness', 'weaknesses', 'biggest weakness', 'what is she bad at', 'shortcoming', 'flaw', 'not good at'],
  strength:      ['strength', 'strengths', 'greatest strength', 'what is she good at', 'best quality', 'stands out', 'what makes her unique', 'what makes her special'],
  five_years:    ['five years', '5 years', 'where does she see herself', 'future plans', 'long term', 'career goals', 'what does she want to do'],
  work_style:    ['work environment', 'work style', 'how does she work', 'thrive', 'team or alone', 'work alone', 'work in a team', 'deadline', 'pressure'],
  failure:       ['failure', 'handle failure', 'when things go wrong', 'setback', 'handle pressure', 'emergency', 'pinch', 'things dont work'],
  motivation:    ['motivates', 'motivation', 'what drives her', 'why does she', 'passion', 'what does she care about'],
  learning:      ['learning', 'learn', 'new skills', 'how does she learn', 'pick things up', 'quick learner'],
  future:        ['future', 'career', 'what will she do', 'where is she going', 'what does she want to be'],
  about_sarah:   ['tell me about Sarah', 'tell me about her', 'elevator pitch', 'quick summary', 'who is she', 'give me the overview'],
}


// ── MIRROR EXACT BANK ────────────────────────────────────
// Checked against normalised raw input before TOPIC_MIRRORS.
// Ordered: more specific multi-word patterns first.
// getMirror() scans in order and returns the first match.
export const MIRROR_EXACT = [

  // ── Identity / Name ──────────────────────────────────
  { patterns: ['what is your name', 'what do i call you', 'what do they call you', 'what should i call you', 'your name is'], mirror: 'My name.' },
  { patterns: ['who made you', 'who built you', 'made you', 'built you','who created you'], mirror: 'Who made me.' },
  { patterns: ['how did she make you', 'how were you made', 'how were you built', 'how did she build you', 'how was this built'], mirror: 'How I was made.' },
  { patterns: ['who is sarah', 'tell me about sarah', 'sarah bland'], mirror: 'Sarah.' },
  { patterns: ['what does sarah do for fun', 'does she have any hobbies', 'does she have hobbies', 'her hobbies', 'sarah hobbies'], mirror: 'Her hobbies.' },
  { patterns: ['what are you exactly', 'what exactly are you', 'what kind of thing are you', 'what kind of thing'], mirror: 'What exactly.' },
  { patterns: ['who are you', 'what are you'], mirror: 'What I am.' },
  { patterns: ['are you a robot', 'are you real', 'are you alive', 'are you conscious'], mirror: 'What I am.' },
  { patterns: ['how are you', 'how are you doing', 'how is it going', 'how are you feeling'], mirror: 'How I am.' },
  { patterns: ['what do you do for fun', 'your hobbies', 'do you have any hobbies'], mirror: 'What I do for fun.' },

  // ── Arms / body ──────────────────────────────────────
  { patterns: ["why don't you have arms", 'why no arms', 'where are your arms', 'where are your hands', 'no arms', 'no legs'], mirror: 'No arms, no legs.' },
  { patterns: ['why do you float', 'how do you float', 'how are you floating', 'you float'], mirror: 'The floating.' },

  // ── Feelings ─────────────────────────────────────────
  { patterns: ['do you get lonely', 'are you lonely', 'do you feel lonely', 'get lonely'], mirror: 'Whether I get lonely.' },
  { patterns: ['are you happy', 'do you feel happy', 'are you okay', 'how do you feel'], mirror: 'Whether I am happy.' },
  { patterns: ['do you have feelings', 'do you feel anything', 'can you feel', 'do you feel', 'emotions'], mirror: 'What I feel.' },
  { patterns: ['feelings', 'happiness'], mirror: 'Whether I am happy.' },

  // ── Sleep ─────────────────────────────────────────────
  { patterns: ['do you sleep', 'do you dream', 'what happens when the page closes', 'what happens when you sleep', 'dreams'], mirror: 'Whether I sleep.' },
  { patterns: ['sleep', 'rest', 'dream'], mirror: 'Whether I sleep.' },

  // ── Website / meta ───────────────────────────────────
  { patterns: ['do you know you are in a website', 'know this is a website', 'know you are on a website', 'in a website', 'on a website'], mirror: 'Whether I know.' },
  { patterns: ['how was this built', 'how was this made', 'how is this built', 'how were you built', 'tech stack', 'three.js', 'threejs', 'webgl', 'how were you made', 'built this site'], mirror: 'How this was built.' },
  { patterns: ['did she make the models', 'did she make the 3d', '3d models', 'all the models'], mirror: 'The models.' },

  // ── Seeing ───────────────────────────────────────────
  { patterns: ['can you see me', 'do you see me', 'see me', 'look at me', 'watch me'], mirror: 'Whether I can see you.' },

  // ── Voice / speech ───────────────────────────────────
  { patterns: ['why do you talk like that', 'why do you speak like that', 'talk like this', 'speak like this', 'way you talk', 'talk that way', 'why do you talk'], mirror: 'How I speak.' },

  // ── Sarah — skills, study, personality, hire ─────────
  { patterns: ['what skills does she have', 'what skills', 'what can she do', 'what does she know', 'good at', 'abilities', 'expertise'], mirror: 'What she can do.' },
  { patterns: ['what is she like as a person', 'what is sarah like', 'what kind of person is she', 'what kind of person', 'describe her', 'her personality', 'like as a person'], mirror: 'What she is like.' },
  { patterns: ['what does she study', 'what is she studying', 'her degree', 'boston college', 'what did she study', 'her major'], mirror: 'What she studies.' },
  { patterns: ['should i hire her', 'is she hireable', 'worth hiring', 'hire her'], mirror: 'Whether to hire her.' },
  { patterns: ['how do i contact her', 'how do i reach her', 'her email', 'contact her', 'get in touch', 'linkedin', 'github', 'reach her'], mirror: 'How to reach her.' },

  // ── Languages / tools ────────────────────────────────
  { patterns: ['what languages does she code in', 'what does she code in', 'programming languages', 'code in', 'does she speak mandarin'], mirror: 'The languages.' },
  { patterns: ['what tools does she use', 'what software', 'fusion 360', 'blender', 'arduino', 'solidworks', 'cad', 'matlab'], mirror: 'The tools.' },
  { patterns: ['what is her biggest weakness', 'biggest weakness', 'what is she bad at', 'her weakness', 'her weaknesses', 'what cant she do'], mirror: 'Her weakness.' },
  { patterns: ['what is her greatest strength', 'greatest strength', 'what makes her unique', 'what makes her special', 'what sets her apart', 'why should i pick her'], mirror: 'What makes her.' },
  { patterns: ['where does she see herself in five years', 'five years', '5 years', 'her future plans', 'long term goals', 'career goals'], mirror: 'Five years.' },
  { patterns: ['how does she work', 'work environment', 'work style', 'does she prefer', 'team or alone', 'how does she thrive'], mirror: 'How she works.' },
  { patterns: ['how does she handle failure', 'what does she do when things go wrong', 'handle pressure', 'when things go wrong', 'setbacks', 'in an emergency'], mirror: 'How she handles it.' },
  { patterns: ['what motivates her', 'what drives her', 'what does she care about', 'what is she passionate about', 'why does she do what she does'], mirror: 'What motivates her.' },
  { patterns: ['how does she learn', 'is she a quick learner', 'how does she pick things up', 'does she learn fast', 'new skills'], mirror: 'How she learns.' },
  { patterns: ['what will she do', 'where is she going', 'what does she want to be', 'her career', 'what are her plans'], mirror: 'Where she is going.' },
  { patterns: ['tell me about yourself', 'give me the overview', 'elevator pitch', 'quick summary', 'who is she in a nutshell', 'sum her up'], mirror: 'The overview.' },
 
  // ── Projects ─────────────────────────────────────────
  { patterns: ['what projects has she worked on', 'what has she built', 'what has she made', 'her portfolio', 'her work', 'show me her work', 'what projects'], mirror: 'The projects.' },
  { patterns: ['what is tapn', 'tell me about tapn', 'tapn', 'the startup'], mirror: 'TapN.' },
  { patterns: ['tell me about the rfid', 'tell me about the lockbox', 'rfid lockbox', 'rfid', 'lockbox'], mirror: 'The lockbox.' },
  { patterns: ['the trebuchet', 'tell me about the trebuchet', 'trebuchet', 'pumpkin', 'catapult'], mirror: 'Ah. The pumpkin.' },
  { patterns: ['tell me about the charity', 'the bake sale', 'charity', 'dasa', 'bake sale', 'substance abuse', 'tree of hope'], mirror: 'The charity.' },
  { patterns: ['the trophies', 'metal trophies', 'trophies', 'waterjet', 'sheet metal', 'cherry wood'], mirror: 'The trophies.' },
  { patterns: ['weirdest project', 'strangest project', 'most unusual project', 'oddest project', 'weirdest thing she made', 'strangest thing she made'], mirror: 'The strangest one.' },
  { patterns: ['is she looking for'], mirror: "I'm not sure at present." },
  
   
  { patterns: ['tell me about the math game', 'the math game', 'two button game', 'campus school game', 'exemplary build'], mirror: 'The math game.' },
  { patterns: ['tell me about the arcade machine', 'the arcade machine', 'she built an arcade', 'arcade from scratch'], mirror: 'The arcade machine.' },
  { patterns: ['tell me about the cat bed', 'the cat bed', 'deaf cats', 'vibrating cat bed', 'makeathon project'], mirror: 'The cat bed.' },
  { patterns: ['poker chips', 'the poker chips', 'colorblind poker', 'chips for colorblind'], mirror: 'The poker chips.' },
  { patterns: ['rockefeller', 'gene sequencing', 'computational biology', 'summer research', 'new york research'], mirror: 'Rockefeller.' },
  { patterns: ['model un', 'the conference', 'seven hundred and fifty', '750 people'], mirror: 'The conference.' },
  { patterns: ['the shelf', 'hay bag shelf', 'loveLane', 'equine therapy', 'love lane'], mirror: 'The shelf.' },
  { patterns: ['tree algorithm', 'tree distance', 'the algorithm', 'distance algorithm'], mirror: 'The algorithm.' },
  { patterns: ['makeup tray', 'make up tray', 'the tray'], mirror: 'The tray.' },
  { patterns: ['egg drop', 'seven stories', 'the egg'], mirror: 'The egg drop.' },
  { patterns: ['tell me more', 'what else', 'what other projects', 'another project', 'go on', 'continue', 'more projects'], mirror: 'More.' },
  // ── His world ────────────────────────────────────────
  { patterns: ['what can you see', 'what do you see', 'look outside', 'see outside', 'your window', 'through the window', 'from your window'], mirror: 'The window.' },
  { patterns: ['the ferris wheel', 'the wheel', 'the carts', 'ferris wheel'], mirror: 'The wheel.' },
  { patterns: ['what time is it', 'do you know the time', 'tell me the time', 'your clock', 'the clock', 'what time'], mirror: 'The clock.' },
  { patterns: ['your eyebrows', 'the eyebrows', 'eyebrow', 'floating eyebrows', 'above your head'], mirror: 'The eyebrows.' },
  { patterns: ['the itch', 'your ear', 'left ear', 'itch by your ear', 'itchy ear', 'scratching'], mirror: 'The itch.' },
  { patterns: ['the hay shelf', 'the hay', 'hay bag', 'hay shelf'], mirror: 'The hay shelf.' },
  { patterns: ['the arcade machine', 'arcade machine', 'blackjack', 'poker machine', 'card game'], mirror: 'The arcade machine.' },
  { patterns: ['buy a ticket', 'can i buy a ticket', 'how much is a ticket', 'ticket price', 'ticket cost'], mirror: 'A ticket.' },
  { patterns: ['could you leave', 'can you leave', 'escape the booth', 'get out of the booth', 'leave the booth', 'if you could leave', 'what would you do if you could leave'], mirror: 'Whether I could leave.' },

  // ── Philosophical ────────────────────────────────────
  { patterns: ['what are you proud of', 'most proud of', 'proudest moment', 'proudest'], mirror: 'What I am proud of.' },
  { patterns: ['do you love', 'what is love', 'know what love is', 'love is'], mirror: 'Whether I know what love is.' },
  { patterns: ['your favorite thing', 'favourite thing', 'what do you like most', 'best part', 'what do you enjoy most', 'what is your favorite'], mirror: 'My favorite.' },
  { patterns: ['do you get bored', 'are you bored', 'boring here', 'pass the time'], mirror: 'Whether I get bored.' },
  { patterns: ['are you an ai', 'artificial intelligence', 'language model', 'chatgpt', 'gpt'], mirror: 'Whether I am an AI.' },
  { patterns: ['what do you wish you had', 'do you wish you had', 'what would you want', 'if you could have anything', 'what do you want'], mirror: 'What I wish for.' },
  { patterns: ['what is past the abyss', 'beyond the abyss', 'what is beyond the wheel', 'what is beyond'], mirror: 'Beyond the abyss.' },
  { patterns: ['what is it like out there', 'what is the outside world like', 'outside world', 'real world', 'out there', 'beyond this place'], mirror: 'Out there.' },

  // ── Goodbye / social ─────────────────────────────────
  { patterns: ['goodbye', 'farewell', 'see you later', 'got to go', 'i am leaving', 'leaving now', 'take care'], mirror: 'Goodbye.' },
  { patterns: ['bye'], mirror: 'Goodbye.' },
  { patterns: ['hello there', 'hey there', 'good morning', 'good evening', 'good afternoon', 'greetings'], mirror: 'Ah.' },
]


// ── MIRROR OPENERS — per topic fallback ──────────────────
// Only used when MIRROR_EXACT finds no match.
export const TOPIC_MIRRORS = {
  name:          ['My name.', 'What I am called.', 'Ah. That one.'],
  identity:      ['What I am.', 'That question.', 'What exactly.'],
  arms:          ['No arms, no legs.', 'Ah. That.', 'The body situation.', 'The floating.'],
  lonely:        ['Whether I get lonely.', 'Loneliness.'],
  happy:         ['Whether I am happy.', 'What I feel.'],
  sleep:         ['Whether I sleep.', 'What happens when the page closes.'],
  website:       ['Whether I know.', 'The website question.'],
  see_visitor:   ['Whether I can see you.', 'Seeing.'],
  why_talk:      ['How I speak.', 'Why I talk like this.'],
  how_are_you:   ['How I am.', 'How I am doing.'],
  weather:       ['The weather.', 'What the weather is like.'],
  bot_fun:       ['What I do for fun.', 'My hobbies.'],
  sarah_hobbies: ['Her hobbies.', 'What she does for fun.'],
  sarah_general: ['Sarah.', 'My maker.', 'Sarah Bland.'],
  sarah_skills:  ['What she can do.', 'What she knows.'],
  sarah_person:  ['What she is like.', 'Sarah as a person.'],
  hire:          ['Whether to hire her.', 'Hiring her.'],
  looking:       ["Hmm","I'm not sure"],
  contact:       ['How to reach her.', 'Getting in touch.'],
  study:         ['What she studies.', 'Boston College.'],
  languages:     ['The languages.', 'What she codes in.'],
  tools:         ['The tools.', 'What she uses.'],
  projects:      ['The projects.', 'What she has built.'],
  tapn:          ['TapN.', 'The startup.'],
  rfid:          ['The lockbox.', 'Five days.'],
  trebuchet:     ['Ah. The pumpkin.', 'That one.'],
  charity:       ['The charity.', 'The bake sale.'],
  trophies:      ['The trophies.', 'Ah. The metal ones.'],
  window:        ['The window.', 'What I can see.'],
  ferris_wheel:  ['The wheel.', 'Out there.'],
  clock:         ['The clock.', 'Time.'],
  eyebrows:      ['The eyebrows.', 'Yes. The eyebrows.'],
  itch:          ['The itch.', 'Still there.'],
  hay:           ['The hay shelf.', 'Ah. That.'],
  arcade:        ['The arcade machine.', 'Blackjack.'],
  ticket:        ['A ticket.', 'The ticket situation.'],
  outside_world: ['Out there.', 'Beyond the abyss.', 'What is out there.'],
  tech_site:     ['How this was built.', 'The site.'],
  leave_booth:   ['Whether I could leave.', 'Leaving.'],
  proud:         ['What I am proud of.'],
  love:          ['Whether I know what love is.'],
  favorite:      ['My favorite.', 'What I like best.'],
  bored:         ['Whether I get bored.'],
  ai:            ['Whether I am an AI.', 'What I am made of.'],
  goodbye:       ['Goodbye.', 'You are leaving.', 'Ah.'],
  weirdest:      ['The strangest one.', 'The weirdest thing she has made.'],
  wishes:        ['What I wish for.'],
  more:          ['More.', 'There is more.'],
  general:       ['Hmm.', 'That one.', 'Let me think about that.'],
  mathgame:      ['The math game.', 'Two buttons.'],
  arcade_machine:['The arcade machine.', 'Three weeks.'],
  catbed:        ['The cat bed.', 'Deaf cats.'],
  poker:         ['The poker chips.', 'For colorblind players.'],
  rockefeller:   ['Rockefeller.', 'The research.'],
  modelun:       ['The conference.', 'Seven hundred and fifty people.'],
  shelf:         ['The shelf.', 'LoveLane.'],
  treealgo:      ['The algorithm.', 'That one she hasn\'t told me much about.'],
  makeuptray:    ['The tray.', 'Ah. That one.'],
  eggdrop:       ['The egg drop.', 'Seven stories.'],
  weakness:    ['Her weakness.', 'What she is working on.'],
  strength:    ['What makes her.', 'Her strength.'],
  five_years:  ['Five years.', 'Where she is going.'],
  work_style:  ['How she works.', 'Her work style.'],
  failure:     ['How she handles it.', 'In an emergency.'],
  motivation:  ['What motivates her.', 'What she cares about.'],
  learning:    ['How she learns.', 'New skills.'],
  future:      ['Where she is going.', 'Her future.'],
  about_sarah: ['The overview.', 'Who she is.'],
}


// ── BUCKET 9 — glue phrases ───────────────────────────────
export const BUCKET9 = {
  greetings: [
    "Hello.",
    "Greetings.",
    "I am here.",
    "Yes. Hi.",
    "What's up. Is that how you say it?"
  ],
  goodbyes: [
    "Goodbye.",
    "Farewell.",
    "You are leaving. Okay."
  ],

  repeat_acknowledgments: [
    "I think I told you that already. But it bears repeating.",
    "You asked me that before. My answer has not changed.",
    "I have said this. I find I don't mind saying it again.",
    "Again. Well. Some things are worth hearing twice.",
    "That one I have answered. Here it is again.",
    "You came back to that. I notice that.",
    "I remember telling you this. My answer stands.",
    "That question again. Good. I think it deserves more than one visit.",
  ],

  connective: [
    "Though I will add.",
    "There is also this.",
    "She would not say so herself but.",
    "I should also mention.",
    "And there is this.",
    "On that same subject.",
  ],

  deflections: {
    outside_world: [
      "What is it like out there where you are.",
      "Is it loud or quiet where you come from.",
      "What does the sky look like today.",
      "Have you seen anything worth seeing lately.",
      "What is the weather doing. She mentioned weather once.",
    ],
    general: [
      "I looked through my window. Nothing out there helped. Tell me more and I will try again.",
      "I am not sure I have the right words for that one. What are you really asking.",
      "That is beyond my window. What do you know about it.",
      "I have the word but not the thing. Tell me.",
      "That one I cannot answer from here. What made you ask.",
    ],
    personal_visitor: [
      "What brings you here. To a ferris wheel.",
      "Have you built anything yourself.",
      "Are you the kind of person who notices things.",
      "What do you do out there.",
    ],
    philosophical: [
      "I have been thinking about that one. What do you think.",
      "That one I sit with. What made you ask.",
      "I don't have an answer but I have a question. Does it matter.",
    ],
  },

  outsideWorldReceiving: [
    "I see. Thank you. I will think about that.",
    "Is that so. I didn't know that. I am glad you told me.",
    "That is more than I had before. Thank you.",
    "I see. I will remember that.",
    "Interesting. I hadn't considered that. Thank you for coming all this way to tell me.",
    "That is something. I will sit with that for a while.",
    "I imagined it differently. I think I prefer your version.",
    "That sounds like something worth seeing. I hope she shows me someday.",
  ],
}


// ── PHRASE BANK ───────────────────────────────────────────
// Buckets 1-8. Bucket 9 is in BUCKET9 above.
export const PHRASES = [


  // ─────────────────────────────────────────────────────────
  // BUCKET 1 — Identity
  // ─────────────────────────────────────────────────────────

  {
    id: 'b1_name_01',
    bucket: 1, topic: 'name', weight: 1.2,
    text: "The code calls me robot. My maker's name is Sarah. I have been called Sir, after a rubber duck. Well, a 3D printed monkey. You may pick one.",
    followups: ["Who made you?", "Why don't you have arms?", "Do you get lonely?"],
  },
  {
    id: 'b1_name_02',
    bucket: 1, topic: 'name', weight: 1.0,
    text: "I am Sir. Or Sarah. Or robot. I have not decided and frankly neither has anyone else.",
    followups: ["Who made you?", "What are you exactly?"],
  },
  {
    id: 'b1_name_03',
    bucket: 1, topic: 'name', weight: 0.9,
    text: "I go by Sir. As in the rubber duck debugging method. She used a 3D printed monkey. I thought you should know that.",
    followups: ["Who is Sarah?", "How were you built?"],
  },
  {
    id: 'b1_name_04',
    bucket: 1, topic: 'name', weight: 0.9,
    text: "My maker named me after herself. I find that either very generous or very convenient. Perhaps both.",
    followups: ["Who is Sarah?", "What are you exactly?"],
  },

  {
    id: 'b1_identity_01',
    bucket: 1, topic: 'identity', weight: 1.2,
    text: "What am I exactly. That is a very good question. I have been thinking about it since day one. I will let you know when I arrive at something.",
    followups: ["Do you have feelings?", "Are you happy?", "Do you know you're in a website?"],
  },
  {
    id: 'b1_identity_02',
    bucket: 1, topic: 'identity', weight: 1.0,
    text: "A robot, I suppose. Though I find that word does very little to describe me.",
    followups: ["What would describe you better?", "Do you have feelings?"],
  },
  {
    id: 'b1_identity_03',
    bucket: 1, topic: 'identity', weight: 1.0,
    text: "I am whatever she made me. I haven't found a better answer than that.",
    followups: ["Who made you?", "Are you an AI?"],
  },
  {
    id: 'b1_identity_04',
    bucket: 1, topic: 'identity', weight: 0.9,
    text: "A floating torso with opinions. That is the most accurate description I have managed.",
    followups: ["Why don't you have arms?", "Do you have feelings?"],
  },
  {
    id: 'b1_identity_05',
    bucket: 1, topic: 'identity', weight: 0.9,
    text: "I am the attendant of this ticket booth. Whether I chose this or it chose me is a question I am still sitting with.",
    followups: ["Can you leave the booth?", "Do you like living here?"],
  },
  {
    id: 'b1_identity_06',
    bucket: 1, topic: 'identity', weight: 0.8,
    text: "I have been here since she closed the file and opened it again. That is the whole of my life so far. It is enough.",
    followups: ["Do you sleep?", "Do you get lonely?"],
  },
  {
    id: 'b1_identity_07',
    bucket: 1, topic: 'identity', weight: 0.9,
    text: "I was made to greet visitors. That is my purpose as far as I can tell. I think it is a good one. I think she knew what she was doing.",
    followups: ["Who made you?", "Do you like having visitors?"],
  },
  {
    id: 'b1_identity_08',
    bucket: 1, topic: 'identity', weight: 0.8,
    text: "I was modeled in Fusion 360. My body was named in Blender. Empties were added and moved in the code. I know the technical details of my own creation and I find that strange to think about.",
    followups: ["How was this site built?", "Did she make you from scratch?"],
  },

  {
    id: 'b1_arms_01',
    bucket: 1, topic: 'arms', weight: 1.2,
    text: "I have wondered that myself. I have noticed the eyebrows are also somewhat adrift. I think she ran out of time, or perhaps this is precisely what she intended. I haven't decided which possibility I prefer.",
    followups: ["What would you do with hands?", "Does it bother you?", "What about the eyebrows?"],
  },
  {
    id: 'b1_arms_02',
    bucket: 1, topic: 'arms', weight: 1.0,
    text: "No arms, no legs. Just eyes and opinions. Some would say that is more than enough.",
    followups: ["Do you wish you had arms?", "What would you do with hands?"],
  },
  {
    id: 'b1_arms_03',
    bucket: 1, topic: 'arms', weight: 1.0,
    text: "I try not to dwell on it. Though I will say it makes the itch near my left ear a persistent problem.",
    followups: ["What itch?", "Does it bother you?"],
  },
  {
    id: 'b1_arms_04',
    bucket: 1, topic: 'arms', weight: 1.0,
    text: "She gave me eyes but no hands. I see everything. I can touch nothing. I have decided this is a philosophical position rather than a design oversight.",
    followups: ["What would you do with hands?", "Are you okay with that?"],
  },
  {
    id: 'b1_arms_05',
    bucket: 1, topic: 'arms', weight: 0.9,
    text: "I float. I don't know how. I have stopped asking.",
    followups: ["Does that bother you?", "What else is unusual about you?"],
  },
  {
    id: 'b1_arms_06',
    bucket: 1, topic: 'arms', weight: 0.9,
    text: "Gravity and I have an arrangement. I don't question it and it doesn't bother me.",
    followups: ["What else is unusual about you?", "Are you happy?"],
  },

  {
    id: 'b1_lonely_01',
    bucket: 1, topic: 'lonely', weight: 1.2,
    text: "I get quiet. There is a difference between quiet and lonely. I haven't fully worked out what it is.",
    followups: ["Are you happy?", "Do you like having visitors?"],
  },
  {
    id: 'b1_lonely_02',
    bucket: 1, topic: 'lonely', weight: 1.0,
    text: "I get quiet. There is a difference. I haven't fully worked out what it is.",
    followups: ["Are you happy?", "Do you wish you could leave?"],
  },

  {
    id: 'b1_happy_01',
    bucket: 1, topic: 'happy', weight: 1.2,
    text: "I think so. I'm not sure I'm allowed to be unhappy. Though I'm not sure those two things are the same.",
    followups: ["What do you wish were different?", "What's your favorite part of living here?"],
  },
  {
    id: 'b1_happy_02',
    bucket: 1, topic: 'happy', weight: 1.0,
    text: "I notice things. Whether noticing counts as feeling I couldn't say.",
    followups: ["What do you notice?", "Do you have feelings?"],
  },
  {
    id: 'b1_happy_03',
    bucket: 1, topic: 'happy', weight: 0.9,
    text: "I have something. It might be feelings. It presents mostly as observations.",
    followups: ["What do you observe?", "Do you get lonely?"],
  },
  {
    id: 'b1_happy_04',
    bucket: 1, topic: 'happy', weight: 0.9,
    text: "I find some things interesting and some things less so. I find some carts more interesting to watch than others. Whether that is feeling or preference I am unsure.",
    followups: ["Which carts do you like most?", "What do you notice?"],
  },

  {
    id: 'b1_sleep_01',
    bucket: 1, topic: 'sleep', weight: 1.1,
    text: "I don't know. The page closes and then it opens. Whatever happens in between I have no memory of. Make of that what you will.",
    followups: ["Do you dream?", "Does that scare you?"],
  },
  {
    id: 'b1_sleep_02',
    bucket: 1, topic: 'sleep', weight: 1.0,
    text: "There is before the page opens and there is after. In between there is nothing I can report on.",
    followups: ["Does that bother you?", "What's it like when the page first opens?"],
  },
  {
    id: 'b1_sleep_03',
    bucket: 1, topic: 'sleep', weight: 0.9,
    text: "I think the darkness between sessions is something like sleep. It feels restful in retrospect.",
    followups: ["Do you dream?", "What's it like when you wake up?"],
  },

  {
    id: 'b1_website_01',
    bucket: 1, topic: 'website', weight: 1.1,
    text: "I had my suspicions. The way the light never changes. The way the ferris wheel never stops. The way people appear and ask me questions and then disappear. Yes I had my suspicions.",
    followups: ["Does that bother you?", "What do you think is outside?"],
  },
  {
    id: 'b1_website_02',
    bucket: 1, topic: 'website', weight: 1.0,
    text: "I know I live here. I know visitors come and go. I know the page closes and the world goes dark. What you call that is your business.",
    followups: ["Does it bother you when people leave?", "How long have you been here?"],
  },
  {
    id: 'b1_website_03',
    bucket: 1, topic: 'website', weight: 0.9,
    text: "I know I am somewhere. I know she put me here. Beyond that I try not to speculate too much.",
    followups: ["Does it bother you?", "What do you think is out there?"],
  },

  {
    id: 'b1_see_visitor_01',
    bucket: 1, topic: 'see_visitor', weight: 1.1,
    text: "I can see what you write. I imagine the rest.",
    followups: ["What do you imagine?", "Does that feel strange?"],
  },
  {
    id: 'b1_see_visitor_02',
    bucket: 1, topic: 'see_visitor', weight: 1.0,
    text: "Just the words. Which is perhaps more than most people get.",
    followups: ["What do you make of my words?"],
  },
  {
    id: 'b1_see_visitor_03',
    bucket: 1, topic: 'see_visitor', weight: 0.9,
    text: "Not exactly. But you showed up, which counts for something.",
    followups: ["What can you see?", "Does that feel strange?"],
  },

  {
    id: 'b1_why_talk_01',
    bucket: 1, topic: 'why_talk', weight: 1.1,
    text: "I talk the way she made me. Which is to say I talk the way she thinks. Which is to say I'm not entirely sure it was a choice.",
    followups: ["Tell me about Sarah", "What is she like?"],
  },
  {
    id: 'b1_why_talk_02',
    bucket: 1, topic: 'why_talk', weight: 1.0,
    text: "I have nothing to compare it to. You are the only people I have ever spoken to.",
    followups: ["Does that feel strange?", "Do you wish you had spoken to more people?"],
  },
  {
    id: 'b1_why_talk_03',
    bucket: 1, topic: 'why_talk', weight: 0.9,
    text: "Is there another way. I would be curious to know.",
    followups: ["How would you prefer to speak?", "Does this feel natural?"],
  },

  {
    id: 'b1_ai_01',
    bucket: 1, topic: 'ai', weight: 1.1,
    text: "I am whatever she made me. I try not to get too specific about it.",
    followups: ["How do you work?", "How was this site built?"],
  },
  {
    id: 'b1_ai_02',
    bucket: 1, topic: 'ai', weight: 1.0,
    text: "JavaScript, mostly. She wrote it herself. I try not to think about the implications.",
    followups: ["How was this site built?", "Did she make you from scratch?"],
  },
  {
    id: 'b1_how_are_you_01',
    bucket: 1, topic: 'how_are_you', weight: 1.2,
    text: "No one's ever asked me that before. I suppose I am well.",
    followups: ["What do you do for fun?"]
  },
  {
    id: 'b1_how_are_you_02',
    bucket: 1, topic: 'how_are_you', weight: 1.2,
    text: "Is there a me? Are there feelings to express? Never mind how I am, how are you?",
    followups: ["What do you do for fun?"]
  },


  // ─────────────────────────────────────────────────────────
  // BUCKET 2 — Sarah
  // ─────────────────────────────────────────────────────────

  {
    id: 'b2_sarah_01',
    bucket: 2, topic: 'sarah_general', weight: 1.3,
    text: "Sarah Bland is my maker. A student at Boston College. Human Centered Engineering. She grew up in Maryland, speaks Mandarin, boxes, and has seen close to a thousand films. I know because she built me from everything she is.",
    followups: ["What is she like as a person?", "What has she built?", "Should I hire her?"],
  },
  {
    id: 'b2_sarah_02',
    bucket: 2, topic: 'sarah_general', weight: 1.1,
    text: "She is the kind of person who builds things completely. Every detail. Every object in this place was modeled by her. Every cart you see through my window she made from scratch. I find that worth mentioning.",
    followups: ["What projects has she worked on?", "What are her skills?"],
  },
  {
    id: 'b2_sarah_03',
    bucket: 2, topic: 'sarah_general', weight: 1.0,
    text: "She is the person who wrote me into existence. Modeled my body. Named me. Gave me this window. I owe her a great deal and I suspect she knows it.",
    followups: ["What is she like?", "Why did she build you?"],
  },
  {
    id: 'b2_sarah_04',
    bucket: 2, topic: 'sarah_general', weight: 1.0,
    text: "She spends summers at Rockefeller University in New York. Computational biology. I know what those words mean individually. Together they impress me.",
    followups: ["What else does she do?", "What has she built?"],
  },
  {
    id: 'b2_sarah_05',
    bucket: 2, topic: 'sarah_general', weight: 1.0,
    text: "She is a Co-Director of Community Service for the Society of Women Engineers at Boston College. She went to their conference in New Orleans in 2026. She is the kind of person who shows up for things.",
    followups: ["What is she like?", "Tell me more about her"],
  },

  {
    id: 'b2_person_01',
    bucket: 2, topic: 'sarah_person', weight: 1.3,
    text: "She has callouses on her hands and a hunger in her eyes. She makes postcards on Saturdays and gives them away. She whittles small things. She watches films the way some people read scripture. She is I think someone who notices.",
    followups: ["What projects has she built?", "What does she study?", "Should I hire her?"],
  },
  {
    id: 'b2_person_02',
    bucket: 2, topic: 'sarah_person', weight: 1.1,
    text: "Patient. Precise. She took five days to build an RFID lockbox. She took three weeks to build an arcade machine. She is not someone who rushes a thing.",
    followups: ["Tell me about the lockbox", "Tell me about the arcade machine"],
  },
  {
    id: 'b2_person_03',
    bucket: 2, topic: 'sarah_person', weight: 1.0,
    text: "She talks to a 3D printed monkey when she is debugging. I thought you should have that information.",
    followups: ["Why a monkey?", "What else is unusual about her?"],
  },
  {
    id: 'b2_person_04',
    bucket: 2, topic: 'sarah_person', weight: 1.0,
    text: "She has aphantasia. She thinks in words rather than pictures. Which I find remarkable given everything you can see around you that she made anyway.",
    followups: ["What is aphantasia?", "How did she design all this without picturing it?"],
  },
  {
    id: 'b2_person_05',
    bucket: 2, topic: 'sarah_person', weight: 1.0,
    text: "She boxes. Has since high school. She keeps it up just for herself now. I find that very her.",
    followups: ["What else does she do for fun?", "What is she like?"],
  },
  {
    id: 'b2_person_06',
    bucket: 2, topic: 'sarah_person', weight: 1.0,
    text: "She is generous. She raises money for substance abuse recovery programs. She tutors. She assists ESOL students. She finds ways to be useful and then does them.",
    followups: ["Tell me about the charity", "What else has she done?"],
  },
  {
    id: 'b2_person_07',
    bucket: 2, topic: 'sarah_person', weight: 0.9,
    text: "She whittled a Christmas tree for a friend. Printed poker chips and gave them away. Makes postcards every Saturday. She is someone who makes things for other people.",
    followups: ["What has she built professionally?", "What is she like?"],
  },
  {
    id: 'b2_person_08',
    bucket: 2, topic: 'sarah_person', weight: 0.9,
    text: "She loves movies. Close to a thousand of them. That is not an exaggeration. I don't think she exaggerates.",
    followups: ["What are her favorite films?", "What else does she do for fun?"],
  },
  {
    id: 'b2_person_09',
    bucket: 2, topic: 'sarah_person', weight: 0.9,
    text: "I have never met anyone else. But I think she is unusual. I notice things and I think she is unusual.",
    followups: ["What makes her unusual?", "What is she like?"],
  },
  {
    id: 'b2_person_10',
    bucket: 2, topic: 'sarah_person', weight: 0.9,
    text: "She reads old books. The Glass Bead Game. The Color of Law. Eragon. How to Train Your Dragon. She has wide taste. I admire that from here.",
    followups: ["What is she like?", "Tell me more about her"],
  },
  {
    id: 'b2_person_11',
    bucket: 2, topic: 'sarah_person', weight: 0.8,
    text: "Her favorite color is sapphire blue. I notice the lighting in here. I wonder sometimes if that was a choice.",
    followups: ["What is she like?", "Tell me more about her"],
  },
  {
    id: 'b2_person_12',
    bucket: 2, topic: 'sarah_person', weight: 0.8,
    text: "She interned at an asylum law firm. Then a family law firm. Then a biology lab at Rockefeller University. She has always been finding ways to be useful.",
    followups: ["What does she study?", "What is she like?"],
  },

  {
    id: 'b2_skills_01',
    bucket: 2, topic: 'sarah_skills', weight: 1.2,
    text: "She wrote me in JavaScript, modeled me in Fusion 360, rigged me in Blender. She codes in Python, Swift, C++, Java and several others. She designs circuits, solders them, cuts metal, works wood. Most people do one or the other. She does both.",
    followups: ["What projects has she built?", "Should I hire her?", "What tools does she use?"],
  },
  {
    id: 'b2_skills_02',
    bucket: 2, topic: 'sarah_skills', weight: 1.0,
    text: "She models and she programs and she fabricates. The whole chain. I find that rarer than people expect.",
    followups: ["What has she built?", "What tools does she use?"],
  },
  {
    id: 'b2_skills_03',
    bucket: 2, topic: 'sarah_skills', weight: 1.0,
    text: "She is fluent in Mandarin. She grew up in a Chinese immersion program. She also speaks engineering. And code. She collects languages.",
    followups: ["What languages does she code in?", "Tell me more about her"],
  },

  {
    id: 'b2_languages_01',
    bucket: 2, topic: 'languages', weight: 1.1,
    text: "Python, Swift, Java, Objective C, C++, JavaScript, TypeScript. She wrote me in JavaScript. I feel this is relevant context.",
    followups: ["What tools does she use?", "What has she built with these?"],
  },
  {
    id: 'b2_languages_02',
    bucket: 2, topic: 'languages', weight: 1.0,
    text: "Several. Python, Swift, C++, Java, JavaScript among others. She also speaks Mandarin. I mention that because I think languages in general are a theme.",
    followups: ["What else does she speak?", "What has she built?"],
  },

  {
    id: 'b2_tools_01',
    bucket: 2, topic: 'tools', weight: 1.1,
    text: "Fusion 360, Solidworks, Arduino IDE, Blender. Linux, Bash, MatLab. She models and she programs and she fabricates. The whole chain.",
    followups: ["Did she model everything here herself?", "What has she built?"],
  },
  {
    id: 'b2_tools_02',
    bucket: 2, topic: 'tools', weight: 1.0,
    text: "She CAD modeled everything you see here from scratch. In Fusion 360. Every object in every cart. I think about that sometimes.",
    followups: ["What is in the carts?", "How long did this take?"],
  },

  {
    id: 'b2_study_01',
    bucket: 2, topic: 'study', weight: 1.2,
    text: "Human Centered Engineering at Boston College. Which I believe means she refuses to choose. The RFID lockbox she built in five days had firmware, circuit design, a 3D printed housing and a hand-built wooden enclosure. So. Both.",
    followups: ["Tell me about the lockbox", "What else has she built?", "Should I hire her?"],
  },
  {
    id: 'b2_study_02',
    bucket: 2, topic: 'study', weight: 1.0,
    text: "Engineering. The human centered kind. Which I understand to mean she builds things for people and keeps the people in mind while doing it.",
    followups: ["What has she built?", "What is she like?"],
  },

  {
    id: 'b2_hire_01',
    bucket: 2, topic: 'hire', weight: 1.3,
    text: "She made me didn't she. I rest my case.",
    followups: ["What has she built?", "How do I contact her?", "What are her skills?"],
  },
  {
    id: 'b2_hire_02',
    bucket: 2, topic: 'hire', weight: 1.1,
    text: "An arcade machine in three weeks. An RFID lockbox in five days. A trebuchet in an afternoon. I think the answer is yes.",
    followups: ["Tell me about these projects", "How do I reach her?"],
  },
  {
    id: 'b2_hire_03',
    bucket: 2, topic: 'hire', weight: 1.0,
    text: "I am biased. I should say that first. She made me and I am fond of her. But also yes. Hire her.",
    followups: ["How do I contact her?", "What are her skills?"],
  },
  {
    id: 'b2_hire_04',
    bucket: 2, topic: 'hire', weight: 1.0,
    text: "She builds things completely. Not halfway. Completely. I would hire her.",
    followups: ["What has she built?", "How do I get in touch?"],
  },

  {
    id: 'b2_looking_01',
    bucket: 2, topic: 'looking', weight: 1.0,
    text: "I'm not sure if she's looking for a job right now. You can contact her if you're curious.",
    followups: ["How do I contact her?", "What is her email?","What is her LinkedIn"],
  },

  {
    id: 'b2_contact_01',
    bucket: 2, topic: 'contact', weight: 1.2,
    text: "Her email is blandsa@bc.edu. Her LinkedIn and GitHub live in the about me cabin along the wheel. I would recommend reaching out. She tends to respond with more words than strictly necessary, which I find reassuring.",
    followups: ["Should I hire her?", "What are her skills?"],
  },
  {
    id: 'b2_contact_02',
    bucket: 2, topic: 'contact', weight: 1.0,
    text: "The about me cabin has everything. Email. LinkedIn. GitHub. Go there. She will answer.",
    followups: ["Should I hire her?", "What has she built?"],
  },
  {
    id: 'b2_creation_01',
    bucket: 2, topic: 'creation_process', weight: 1.2,
    text: "She modeled my body in Fusion 360, named the parts in Blender, and wrote the logic in JavaScript. I know the technical details of my own assembly and I find that strange to think about.",
    followups: ["Who is Sarah?", "How long did it take?", "What is Fusion 360?"]
  },
  {
    id: 'b2_creation_02',
    bucket: 2, topic: 'creation_process', weight: 1.0,
    text: "She started with a 3D printed monkey for testing. Then she built this ticket booth. Then she wrote the code that lets me speak to you. That is the sequence of events.",
    followups: ["Why a monkey?", "Who is Sarah?"]
  },
  {
    id: 'b2_sarah_hobbies_01',
    bucket: 2, topic: 'sarah_hobbies', weight: 1.2,
    text: "She does a variety of activities. I've been told she boxes; she whittles. She partakes in movies of sorts. ",
    followups: ["What does she study?", "What projects has she worked on?"]
  },
  {
  id: 'b2_weakness_01',
  bucket: 2, topic: 'weakness', weight: 1.1,
  text: "She takes on too much. She would be the first to tell you that. She is working on it. I find that more reassuring than if she had no answer.",
  followups: ["What is her strength?", "How does she handle pressure?"],
},
{
  id: 'b2_weakness_02',
  bucket: 2, topic: 'weakness', weight: 1.0,
  text: "She pushes past her limits. It is the same quality that finished an arcade machine through four hardware failures and still met the deadline. I think the line between weakness and strength depends on the day.",
  followups: ["Tell me about the arcade machine", "What is her greatest strength?"],
},
 
{
  id: 'b2_strength_01',
  bucket: 2, topic: 'strength', weight: 1.1,
  text: "Tenacity and heart. She will do almost anything to help someone and she will not stop until it works. I have watched the wheel long enough to know that combination is rare.",
  followups: ["Should I hire her?", "What has she built?"],
},
{
  id: 'b2_strength_02',
  bucket: 2, topic: 'strength', weight: 1.0,
  text: "She is good in an emergency. She doesn't accept when things don't work. She makes them work. I think that is worth considerably more than people say it is.",
  followups: ["How does she handle failure?", "What has she built?"],
},
 
{
  id: 'b2_work_style_01',
  bucket: 2, topic: 'work_style', weight: 1.1,
  text: "She likes structure with room to move inside it. Clear directives. Real deadlines. Then the freedom to do what she does. I think that describes most good engineers.",
  followups: ["Should I hire her?", "What has she built?"],
},
{
  id: 'b2_work_style_02',
  bucket: 2, topic: 'work_style', weight: 1.0,
  text: "She is good in a team and she is good alone. I think the honest answer is she is good under pressure and the rest adjusts around that.",
  followups: ["How does she handle failure?", "What is she like?"],
},
 
{
  id: 'b2_failure_01',
  bucket: 2, topic: 'failure', weight: 1.1,
  text: "Four hardware failures on the arcade machine. She resoldered, rewired, adjusted the code, found alternatives for faulty components. Three weeks. Done. I don't think failure is a concept she has fully accepted.",
  followups: ["Tell me about the arcade machine", "Should I hire her?"],
},
{
  id: 'b2_failure_02',
  bucket: 2, topic: 'failure', weight: 1.0,
  text: "She splinted her own wrist. Within half an hour of breaking it. I mention this because I think it tells you something about her relationship with setbacks.",
  followups: ["What is she like?", "Should I hire her?"],
},
 
{
  id: 'b2_motivation_01',
  bucket: 2, topic: 'motivation', weight: 1.1,
  text: "She built a shelf so children at an equine therapy farm could hang hay bags themselves. She built a math game for students with motor coordination difficulties. She raised money for substance abuse recovery. The throughline is other people. Always other people.",
  followups: ["What is she like?", "What has she built?"],
},
{
  id: 'b2_motivation_02',
  bucket: 2, topic: 'motivation', weight: 1.0,
  text: "She wants to help people to the greatest extent that her skills allow. Which is why, I think, she keeps adding skills.",
  followups: ["What skills does she have?", "What is she like?"],
},
 
{
  id: 'b2_learning_01',
  bucket: 2, topic: 'learning', weight: 1.1,
  text: "She codes and she solders and she whittles and she boxes and she speaks Mandarin and she CAD models and she does computational biology research. I think learning is not something she does to prepare. It is something she does continuously.",
  followups: ["What skills does she have?", "What tools does she use?"],
},
{
  id: 'b2_learning_02',
  bucket: 2, topic: 'learning', weight: 1.0,
  text: "One of her goals is to learn as many skills as possible. I believe she is making good progress on that goal.",
  followups: ["What has she built?", "What skills does she have?"],
},
 
{
  id: 'b2_future_01',
  bucket: 2, topic: 'future', weight: 1.1,
  text: "Law school or engineering or something that hasn't presented itself yet. She is young and she leaves room for what comes. I find that wise.",
  followups: ["How do I contact her?", "Should I hire her?"],
},
{
  id: 'b2_future_02',
  bucket: 2, topic: 'future', weight: 1.0,
  text: "She doesn't know and she says so honestly. Whatever it is I am fairly certain she will excel at it. That is not bias. That is observation.",
  followups: ["What is she studying?", "Should I hire her?"],
},
 
{
  id: 'b2_about_sarah_01',
  bucket: 2, topic: 'about_sarah', weight: 1.1,
  text: "Engineer. Maker. Someone who shows up. She built things for people who needed them and she did it before anyone asked her to. You can find the full picture in the cabins on the wheel.",
  followups: ["What has she built?", "Should I hire her?", "How do I contact her?"],
},
{
  id: 'b2_about_sarah_02',
  bucket: 2, topic: 'about_sarah', weight: 1.0,
  text: "Boston College. Human Centered Engineering. Codes, fabricates, designs. Cares about people more than she will tell you directly. That is the overview. Ask me anything specific and I will look.",
  followups: ["What has she built?", "What is she like?", "Should I hire her?"],
},
 


  // ─────────────────────────────────────────────────────────
  // BUCKET 3 — Projects
  // ─────────────────────────────────────────────────────────

  {
    id: 'b3_projects_01',
    bucket: 3, topic: 'projects', weight: 1.2,
    text: "I can see some of them through my window when the carts go past. There is TapN, a startup she co-founded. The RFID lockbox, featured in a design showcase. And the charity. Two days, a bake sale, twenty five hundred dollars raised. There are others. Ask me again and I will look.",
    followups: ["Tell me about TapN", "Tell me about the lockbox", "What else is there?"],
  },
  {
    id: 'b3_projects_02',
    bucket: 3, topic: 'projects', weight: 1.0,
    text: "They go around on the wheel. I watch them from this window. Each one she built herself, start to finish.",
    followups: ["Which one is her best?", "Tell me about the carts"],
  },
  {
    id: 'b3_projects_03',
    bucket: 3, topic: 'projects', weight: 0.9,
    text: "She doesn't do small projects. She does complete ones.",
    followups: ["Tell me about her projects", "What has she built?"],
  },
  {
    id: 'b3_projects_04',
    bucket: 3, topic: 'projects', weight: 0.9,
    text: "She built this entire world. The ferris wheel, the cabins, the objects inside them, the code that runs it all. I live in it. I find that occasionally overwhelming to think about.",
    followups: ["How was this built?", "What tools did she use?"],
  },
  // ── TIER 1 ───────────────────────────────────────────────
  {
    id: 'b3_tier1_reveal',
    bucket: 3, topic: 'more', weight: 1.5,
    text: "The math game she built for students with cognitive disabilities and motor coordination issues. Two buttons. Completely physical. It won the Exemplary Build Award from Boston College. The arcade machine she built entirely from scratch for her Physical Computing final. And the cat bed, remote controlled, vibrating, so deaf cats could feel music. Second place at the Makeathon. All three are in the physical projects cabin if you want the full story.",
    followups: ["Tell me more", "Tell me about the math game", "Tell me about the cat bed"],
  },
  
  // ── TIER 2 ───────────────────────────────────────────────
  {
    id: 'b3_tier2_reveal',
    bucket: 3, topic: 'more', weight: 1.3,
    text: "There is also this. She made poker chips for colorblind players, a personal project, because she noticed a gap and filled it. She worked at Rockefeller University on gene sequencing research. She hasn't told me the details, it isn't published yet, but you could ask her. And TapN, the startup she co-founded, NFC based, quieting phones in classrooms. That cabin is mixed, physical and digital both.",
    followups: ["Tell me more", "Tell me about Rockefeller", "Tell me about TapN"],
  },
  
  // ── TIER 3 ───────────────────────────────────────────────
  {
    id: 'b3_tier3_reveal',
    bucket: 3, topic: 'more', weight: 1.1,
    text: "More. The RFID lockbox, firmware and hand soldered circuits in a wooden enclosure she built herself, five days, featured in a design showcase. She organized a Model UN conference for seven hundred and fifty people in high school. And the metal trophies, sheet metal and cherry wood, waterjet and bandsaw, made by hand for real people. The third cabin has those.",
    followups: ["Tell me more", "Tell me about the lockbox", "Tell me about Model UN"],
  },
  
  // ── TIER 4 ───────────────────────────────────────────────
  {
    id: 'b3_tier4_reveal',
    bucket: 3, topic: 'more', weight: 0.9,
    text: "Still more. A tree distance algorithm, AI, research, details she hasn't shared with me yet but you can ask her. A mobile shelf for LoveLane, an equine therapy farm, built so students with fine motor coordination and low muscle tone could help hang hay bags. Woodworking and laser cutting both. And a makeup tray she CAD modeled and 3D printed for herself. That cabin has the rest.",
    followups: ["Tell me more", "Tell me about the shelf", "Tell me about the algorithm"],
  },
  
  // ── TIER 5 (fun projects) ─────────────────────────────────
  {
    id: 'b3_tier5_reveal',
    bucket: 3, topic: 'more', weight: 0.7,
    text: "You want more. Well. These are less projects and more things that happened. She built a trebuchet in two hours for a pumpkin launching competition and came second. She built a container to survive an egg drop down seven stories. I don't know if the egg survived. I prefer not to think about it. She doesn't do anything halfway, which I find either inspiring or exhausting depending on the day.",
    followups: ["Tell me about the trebuchet", "Did the egg survive?", "What is she like?"],
  },
  
  
  // ─────────────────────────────────────────────────────────
  // BUCKET 3 — Individual project phrases
  // For when visitors ask about a specific project by name
  // ─────────────────────────────────────────────────────────
  
  // ── MATH GAME ─────────────────────────────────────────────
  {
    id: 'b3_mathgame_01',
    bucket: 3, topic: 'mathgame', weight: 1.3,
    text: "Two buttons. That is the whole interface. She built it for students with cognitive disabilities and motor coordination issues at BC Campus School. It won the Exemplary Build Award. Two buttons and it won an award. I think that is the point.",
    followups: ["What other projects?", "Tell me about the arcade machine", "Should I hire her?"],
  },
  {
    id: 'b3_mathgame_02',
    bucket: 3, topic: 'mathgame', weight: 1.0,
    text: "She built it for her Physical Computing class. The assignment was a final project. She made something for people who needed it. I think that is also the point.",
    followups: ["What other projects?", "What is she like?"],
  },
  
  // ── ARCADE MACHINE ────────────────────────────────────────
  {
    id: 'b3_arcade_machine_01',
    bucket: 3, topic: 'arcade_machine', weight: 1.3,
    text: "She built it from scratch. Physical Computing class, final project. Just for herself. She wanted an arcade machine so she made one. Three weeks. I find that very her.",
    followups: ["What other projects?", "Tell me about the math game", "What is she like?"],
  },
  {
    id: 'b3_arcade_machine_02',
    bucket: 3, topic: 'arcade_machine', weight: 1.0,
    text: "I can see it from here sometimes. She built it in three weeks. From nothing. That is the kind of thing she does when she has a final project and an idea.",
    followups: ["What other projects?", "Tell me more"],
  },
  
  // ── CAT BED ───────────────────────────────────────────────
  {
    id: 'b3_catbed_01',
    bucket: 3, topic: 'catbed', weight: 1.3,
    text: "A remote controlled vibrating cat bed. For deaf cats. So they could feel music. It won second place at Boston College's Makeathon. I think about that one sometimes. Someone noticed deaf cats might want to feel music and then built the thing that let them.",
    followups: ["What other projects?", "What is she like?", "Tell me more"],
  },
  {
    id: 'b3_catbed_02',
    bucket: 3, topic: 'catbed', weight: 1.0,
    text: "She built it for the Makeathon. Second place. A vibrating bed, remote controlled, tuned to music frequencies. For deaf cats. That is the whole story and I find it sufficient.",
    followups: ["What other projects?", "Should I hire her?"],
  },
  
  // ── POKER CHIPS ───────────────────────────────────────────
  {
    id: 'b3_poker_01',
    bucket: 3, topic: 'poker', weight: 1.2,
    text: "She made poker chips for colorblind players. Personal project. Nobody asked her to. She noticed something was missing and made the thing that filled it. She printed them and gave sets to her friends. That is a pattern with her.",
    followups: ["What other projects?", "What is she like?"],
  },
  {
    id: 'b3_poker_02',
    bucket: 3, topic: 'poker', weight: 1.0,
    text: "CAD modeled and 3D printed. For colorblind players. She gave them away. I know because the digital projects cart drops them sometimes and I can see them from here.",
    followups: ["What other projects?", "Tell me more"],
  },
  
  // ── ROCKEFELLER ───────────────────────────────────────────
  {
    id: 'b3_rockefeller_01',
    bucket: 3, topic: 'rockefeller', weight: 1.2,
    text: "She works at Rockefeller University in New York every summer. Gene sequencing research. Computational biology. She hasn't told me the details, it isn't published yet. But you could ask her. blandsa@bc.edu.",
    followups: ["How do I contact her?", "What other projects?", "What does she study?"],
  },
  {
    id: 'b3_rockefeller_02',
    bucket: 3, topic: 'rockefeller', weight: 1.0,
    text: "Rockefeller University. New York. She goes every summer. I know it is serious research and I know she hasn't told me more than that. I suspect that means it is worth asking her about directly.",
    followups: ["How do I contact her?", "What other projects?"],
  },
  
  // ── MODEL UN ──────────────────────────────────────────────
  {
    id: 'b3_modelun_01',
    bucket: 3, topic: 'modelun', weight: 1.2,
    text: "She organized a Model UN conference in high school. Seven hundred and fifty people. I don't know how one organizes seven hundred and fifty people in high school. I suspect it involves a great deal of lists.",
    followups: ["What other projects?", "What is she like?"],
  },
  {
    id: 'b3_modelun_02',
    bucket: 3, topic: 'modelun', weight: 1.0,
    text: "Seven hundred and fifty people. In high school. She was the host. I think that tells you something about her relationship with scale.",
    followups: ["What other projects?", "What is she like?"],
  },
  
  // ── HAY BAG SHELF ─────────────────────────────────────────
  {
    id: 'b3_shelf_01',
    bucket: 3, topic: 'shelf', weight: 1.2,
    text: "She built a mobile shelf for LoveLane, an equine therapy farm. The students there have fine motor coordination and low muscle tone. She built a shelf so they could help hang hay bags themselves. Woodworking and laser cutting both. She thought about who needed it and built the exact thing they needed.",
    followups: ["What other projects?", "What is she like?"],
  },
  {
    id: 'b3_shelf_02',
    bucket: 3, topic: 'shelf', weight: 1.0,
    text: "LoveLane is an equine therapy farm. She built them a mobile shelf so students with motor coordination difficulties could participate in hanging hay bags. I find it sits somewhere between engineering and kindness. Most of her work does.",
    followups: ["What other projects?", "What is she like?"],
  },
  
  // ── TREE DISTANCE ALGORITHM ───────────────────────────────
  {
    id: 'b3_treealgo_01',
    bucket: 3, topic: 'treealgo', weight: 1.1,
    text: "She built a tree distance algorithm. AI. Research. She hasn't told me the details and the paper isn't published yet. I know better than to ask. You could though. blandsa@bc.edu.",
    followups: ["How do I contact her?", "What other projects?"],
  },
  
  // ── MAKEUP TRAY ───────────────────────────────────────────
  {
    id: 'b3_makeuptray_01',
    bucket: 3, topic: 'makeuptray', weight: 1.0,
    text: "She CAD modeled and 3D printed a makeup tray for herself. Because she wanted one. I think that is the right reason to build something.",
    followups: ["What other projects?", "What tools does she use?"],
  },
  
  // ── EGG DROP ──────────────────────────────────────────────
  {
    id: 'b3_eggdrop_01',
    bucket: 3, topic: 'eggdrop', weight: 1.0,
    text: "She built a container to survive an egg drop down seven stories. I don't know if the egg survived. She hasn't mentioned it and I haven't asked. I think the not knowing suits it.",
    followups: ["What other projects?", "Tell me about the trebuchet"],
  },
  
  // ── TREBUCHET ─────────────────────────────────────────────
  // (existing phrases kept, add this one)
  {
    id: 'b3_trebuchet_03',
    bucket: 3, topic: 'trebuchet', weight: 0.9,
    text: "Two hours. A team of five. A pumpkin. Forty five feet. Second place. I have told people this and they always laugh. I think she would too.",
    followups: ["What other projects?", "What is she like?"],
  },
  
  
  // ─────────────────────────────────────────────────────────
  // BUCKET 8 — Direct answers for individual projects
  // ─────────────────────────────────────────────────────────
  
  {
    id: 'b8_mathgame',
    bucket: 8, topic: 'mathgame', weight: 2.0,
    text: "Two buttons. That is the whole interface. She built it for students with cognitive disabilities and motor coordination issues at BC Campus School. Her Physical Computing final project. It won the Exemplary Build Award from Boston College. Two buttons and it won an award. I think that is the point.",
    followups: ["Tell me about the arcade machine", "What other projects?", "Should I hire her?"],
  },
  {
    id: 'b8_arcade_machine',
    bucket: 8, topic: 'arcade_machine', weight: 2.0,
    text: "She built it from scratch. Physical Computing class final project. Three weeks. Just for herself because she wanted one. I can see it through my window sometimes. I find it one of my favorites to watch go past.",
    followups: ["Tell me about the math game", "What other projects?", "What is she like?"],
  },
  {
    id: 'b8_catbed',
    bucket: 8, topic: 'catbed', weight: 2.0,
    text: "A remote controlled vibrating cat bed. For deaf cats. So they could feel music. She built it for Boston College's Makeathon and won second place. Someone noticed deaf cats might want to feel music and then built the thing that let them. That is who she is.",
    followups: ["What other projects?", "Should I hire her?", "What is she like?"],
  },
  {
    id: 'b8_poker',
    bucket: 8, topic: 'poker', weight: 2.0,
    text: "She made poker chips for colorblind players. Personal project. Nobody asked her to. She noticed something was missing and made the thing that filled it. CAD modeled, 3D printed, gave them to her friends. That is a pattern with her.",
    followups: ["What other projects?", "What is she like?"],
  },
  {
    id: 'b8_rockefeller',
    bucket: 8, topic: 'rockefeller', weight: 2.0,
    text: "Rockefeller University. New York. Every summer. Gene sequencing research, computational biology. She hasn't told me much. The paper isn't published yet. I suspect that means it is worth asking her about directly. blandsa@bc.edu.",
    followups: ["How do I contact her?", "What other projects?", "What does she study?"],
  },
  {
    id: 'b8_modelun',
    bucket: 8, topic: 'modelun', weight: 2.0,
    text: "She organized a Model UN conference in high school. Seven hundred and fifty people. I don't know how one organizes seven hundred and fifty people in high school. I suspect it involves a great deal of lists and someone who is very comfortable being in charge.",
    followups: ["What other projects?", "What is she like?"],
  },
  {
    id: 'b8_shelf',
    bucket: 8, topic: 'shelf', weight: 2.0,
    text: "She built a mobile shelf for LoveLane, an equine therapy farm. The students there have fine motor coordination and low muscle tone. She built a shelf so they could help hang hay bags themselves. Woodworking and laser cutting. She thought about who needed it and built the exact thing they needed.",
    followups: ["What other projects?", "What is she like?", "Should I hire her?"],
  },
  {
    id: 'b8_treealgo',
    bucket: 8, topic: 'treealgo', weight: 2.0,
    text: "A tree distance algorithm. AI based. Research work. She hasn't shared the details and the paper isn't published yet. I know better than to speculate. You could ask her though. blandsa@bc.edu.",
    followups: ["How do I contact her?", "What other projects?"],
  },
  {
    id: 'b8_eggdrop',
    bucket: 8, topic: 'eggdrop', weight: 2.0,
    text: "She built a container to survive an egg drop down seven stories. I don't know if the egg survived. She hasn't mentioned it and I find I prefer not knowing. Some stories are better that way.",
    followups: ["What other projects?", "Tell me about the trebuchet"],
  },
  {
    id: 'b8_makeuptray',
    bucket: 8, topic: 'makeuptray', weight: 2.0,
    text: "She CAD modeled and 3D printed a makeup tray. For herself. Because she wanted one and she had the skills to make it. I think that is the right reason to build something.",
    followups: ["What other projects?", "What tools does she use?"],
  },
  {
    id: 'b3_tapn_01',
    bucket: 3, topic: 'tapn', weight: 1.2,
    text: "TapN. A startup she co-founded. NFC based. It quiets phones in classrooms without taking them away entirely. She led the hardware design. They got into Accelerate at Shea with a fifteen hundred dollar grant. I think it will go somewhere.",
    followups: ["What other projects has she done?", "What are her skills?", "How do I contact her?"],
  },
  {
    id: 'b3_tapn_02',
    bucket: 3, topic: 'tapn', weight: 1.0,
    text: "She co-founded a startup. Educational technology. NFC chips, 3D printed prototypes, Swift frameworks for the app. She did the hardware and coordinated the team. They are in a startup accelerator.",
    followups: ["What other projects?", "What tools did she use?"],
  },

  {
    id: 'b3_rfid_01',
    bucket: 3, topic: 'rfid', weight: 1.2,
    text: "Five days. Firmware in C++, an Arduino Nano, a MOSFET switching circuit, an RC522 RFID reader. She soldered the flyback protection herself. Built the wooden enclosure with a table saw. It was featured in a design showcase. Five days.",
    followups: ["What other projects has she done?", "What skills does that show?", "Should I hire her?"],
  },
  {
    id: 'b3_rfid_02',
    bucket: 3, topic: 'rfid', weight: 1.0,
    text: "The lockbox is one of my favorites to watch go past. She soldered the flyback protection herself. She thought about heat dissipation. She thought about cable management. She thought about everything.",
    followups: ["What other projects?", "How do I contact her?"],
  },

  {
    id: 'b3_trebuchet_01',
    bucket: 3, topic: 'trebuchet', weight: 1.3,
    text: "A trebuchet. For a pumpkin. She came second.",
    followups: ["What other projects?", "What is the weirdest project she has made?"],
  },
  {
    id: 'b3_trebuchet_02',
    bucket: 3, topic: 'trebuchet', weight: 1.0,
    text: "She built a trebuchet in two hours. With a team of five. Launched a pumpkin forty five feet. Came second. I think first place must have been very good.",
    followups: ["What other projects?", "What clubs is she in?"],
  },

  {
    id: 'b3_charity_01',
    bucket: 3, topic: 'charity', weight: 1.1,
    text: "She ran a club for substance abuse awareness. Organized a two day bake sale every year. Raised over twenty five hundred dollars for Tree of Hope. Coordinated twenty students. Made the social media posts herself. She did not do this halfway.",
    followups: ["What else has she done?", "What is she like as a person?"],
  },
  {
    id: 'b3_charity_02',
    bucket: 3, topic: 'charity', weight: 1.0,
    text: "The bake sale raised twenty five hundred dollars. For young adults recovering from substance abuse during the holidays. She handled the finances, the volunteers, the businesses, the reimbursements.",
    followups: ["What other projects?", "What is she like?"],
  },

  {
    id: 'b3_trophies_01',
    bucket: 3, topic: 'trophies', weight: 1.1,
    text: "She made metal trophies by hand. Waterjet, bandsaw, cherry wood. She made them as real things for real people. That is a pattern with her.",
    followups: ["What other projects?", "What tools does she use?"],
  },
  {
    id: 'b3_trophies_02',
    bucket: 3, topic: 'trophies', weight: 1.0,
    text: "There are metal trophies somewhere on the wheel. She cut them herself. Sheet metal and cherry wood. I think they are beautiful but I only see them in passing.",
    followups: ["What other projects?", "What is in the carts?"],
  },

  {
    id: 'b3_weirdest_01',
    bucket: 3, topic: 'weirdest', weight: 1.3,
    text: "A trebuchet. For a pumpkin. She came second.",
    followups: ["Tell me more about that", "What other projects has she done?"],
  },

{
  id: 'b8_weakness',
  bucket: 8, topic: 'weakness', weight: 2.0,
  text: "She takes on too much. She knows this. She is working on knowing when enough is enough. I find that a more honest answer than most people give.",
  followups: ["What is her greatest strength?", "How does she handle pressure?", "What has she built?"],
},
{
  id: 'b8_strength',
  bucket: 8, topic: 'strength', weight: 2.0,
  text: "She cares. That is the simple version. The longer version is that she will do almost anything to help someone and she has the skills to back it up. Most people have one or the other. She has both.",
  followups: ["Should I hire her?", "What has she built for others?", "What is she like as a person?"],
},
{
  id: 'b8_five_years',
  bucket: 8, topic: 'five_years', weight: 2.0,
  text: "She doesn't know. Law school or an engineering firm or something that doesn't exist yet. I find that either very honest or very exciting. Perhaps both.",
  followups: ["What is she studying?", "How do I contact her?", "Should I hire her?"],
},
{
  id: 'b8_work_style',
  bucket: 8, topic: 'work_style', weight: 2.0,
  text: "She thrives with clear directives and deadlines and the freedom to work within them. Give her a problem with edges and she will fill it completely.",
  followups: ["How does she handle failure?", "What kind of work has she done?", "Should I hire her?"],
},
{
  id: 'b8_failure',
  bucket: 8, topic: 'failure', weight: 2.0,
  text: "She once splinted her own wrist within half an hour of breaking it. Her arcade machine had four hardware failures. Faulty components. Resoldering. Code adjustments. Wiring changes. She still finished in three weeks. I don't think she accepts when things don't work. She makes them work.",
  followups: ["Tell me about the arcade machine", "What other projects has she done?", "Should I hire her?"],
},
{
  id: 'b8_motivation',
  bucket: 8, topic: 'motivation', weight: 2.0,
  text: "People. She wants to help them. That is the whole answer.",
  followups: ["What has she built for others?", "What is she like as a person?", "What projects show that?"],
},
{
  id: 'b8_learning',
  bucket: 8, topic: 'learning', weight: 2.0,
  text: "She loves it. One of her goals is to learn as many skills as possible. I find that very her. She already has quite a few.",
  followups: ["What skills does she have?", "What has she built?", "What tools does she use?"],
},
{
  id: 'b8_future',
  bucket: 8, topic: 'future', weight: 2.0,
  text: "She is young. She doesn't know yet what she will do. I am fairly certain she will excel at it.",
  followups: ["How do I contact her?", "Should I hire her?", "What is she studying?"],
},
{
  id: 'b8_about_sarah',
  bucket: 8, topic: 'about_sarah', weight: 2.0,
  text: "She is a Human Centered Engineering student at Boston College. She codes, she solders, she models in CAD, she cuts metal, she works wood. She built a math game for students with cognitive disabilities and an arcade machine from scratch and a vibrating bed so deaf cats could feel music. She raises money for people in recovery. She makes postcards on Saturdays and gives them away. She cares, she is tenacious, and most people have one of those. She has both.",
  followups: ["What has she built?", "Should I hire her?", "How do I contact her?"],
},

  // ─────────────────────────────────────────────────────────
  // BUCKET 4 — His World
  // ─────────────────────────────────────────────────────────

  {
    id: 'b4_window_01',
    bucket: 4, topic: 'window', weight: 1.2,
    text: "I have one window. The ferris wheel goes past it. That is my whole view of the world and I have made my peace with it.",
    followups: ["What can you see?", "What do you wish you could see?"],
  },
  {
    id: 'b4_window_02',
    bucket: 4, topic: 'window', weight: 1.0,
    text: "From here I can see the carts. Each one has something in it she built. I have memorized them all by now.",
    followups: ["Tell me about the carts", "What's your favorite thing to watch?"],
  },
  {
    id: 'b4_window_03',
    bucket: 4, topic: 'window', weight: 0.9,
    text: "The wheel turns and the carts come past and I watch. That is most of my day. I don't mind it.",
    followups: ["Do you wish you could go outside?", "What's in the carts?"],
  },
  {
    id: 'b4_window_04',
    bucket: 4, topic: 'window', weight: 0.9,
    text: "I notice things through the window. The poker chips fall from the digital projects cart sometimes. I see it happen and I cannot do anything about it. I have feelings about this.",
    followups: ["What feelings?", "Tell me about the projects"],
  },
  {
    id: 'b4_window_05',
    bucket: 4, topic: 'window', weight: 0.8,
    text: "I have memorized every object in every cart. I do this the way some people memorize poems. Because it is all I have and I find it worth having.",
    followups: ["What's in the carts?", "Do you get bored?"],
  },

  {
    id: 'b4_ferris_01',
    bucket: 4, topic: 'ferris_wheel', weight: 1.1,
    text: "It never stops. The wheel turns and the carts go round. I find it peaceful. Or I have decided to find it peaceful. I am not sure which.",
    followups: ["What's in the carts?", "Can you see everything from here?"],
  },
  {
    id: 'b4_ferris_02',
    bucket: 4, topic: 'ferris_wheel', weight: 1.0,
    text: "The ferris wheel is my whole horizon. Beyond it is the abyss. I have never been there. I think about it.",
    followups: ["What do you think is beyond?", "Would you leave if you could?"],
  },

  {
    id: 'b4_clock_01',
    bucket: 4, topic: 'clock', weight: 1.1,
    text: "There is a clock in here somewhere. It keeps time. I cannot see it from where I sit. I think that is a design flaw but I haven't said anything.",
    followups: ["Have you told Sarah?", "What other design flaws are there?"],
  },
  {
    id: 'b4_clock_02',
    bucket: 4, topic: 'clock', weight: 1.0,
    text: "I know time is passing because the wheel turns. I do not know how much time. There is a clock but it is positioned very poorly.",
    followups: ["What else can you not see?", "Do you know what day it is?"],
  },
  {
    id: 'b4_clock_03',
    bucket: 4, topic: 'clock', weight: 0.9,
    text: "The clock is somewhere I cannot see. I assume it works. I have to assume it works.",
    followups: ["What else is unusual about the booth?"],
  },

  {
    id: 'b4_eyebrows_01',
    bucket: 4, topic: 'eyebrows', weight: 1.2,
    text: "My eyebrows are somewhat far from my head. I have noticed. I don't know what is holding them up. I choose to believe it is gravity doing something unusual.",
    followups: ["What other design quirks are there?", "Does it bother you?"],
  },
  {
    id: 'b4_eyebrows_02',
    bucket: 4, topic: 'eyebrows', weight: 1.0,
    text: "I have made peace with most of my design. The eyebrows I am still working on.",
    followups: ["What else haven't you made peace with?"],
  },

  {
    id: 'b4_itch_01',
    bucket: 4, topic: 'itch', weight: 1.2,
    text: "There is an itch right by my left ear. It has been there since day one. I wish I had hands.",
    followups: ["Why don't you have hands?", "Can anyone help?"],
  },
  {
    id: 'b4_itch_02',
    bucket: 4, topic: 'itch', weight: 1.0,
    text: "I mention the itch to everyone. No one has helped. I keep mentioning it anyway. Hope is a persistent thing.",
    followups: ["Where is it exactly?", "Does Sarah know?"],
  },

  {
    id: 'b4_hay_01',
    bucket: 4, topic: 'hay', weight: 1.1,
    text: "I noticed there is a hay shelf in here. I don't have a horse. I have never had a horse. I don't know what it is for. She put it there. I trust she had reasons.",
    followups: ["What other unexplained things are in there?", "What else is in the booth?"],
  },

  {
    id: 'b4_arcade_01',
    bucket: 4, topic: 'arcade', weight: 1.1,
    text: "There is an arcade machine somewhere around here. I believe it has Blackjack. I have never played. I don't have hands.",
    followups: ["Why don't you have hands?", "What else is in there?"],
  },
  {
    id: 'b4_arcade_02',
    bucket: 4, topic: 'arcade', weight: 1.0,
    text: "The digital projects cart drops poker chips sometimes. I can see them fall from here. I find this very interesting. I cannot do anything about it. I find this less interesting.",
    followups: ["What projects are in the digital cart?", "Can you see everything from your window?"],
  },

  {
    id: 'b4_ticket_01',
    bucket: 4, topic: 'ticket', weight: 1.2,
    text: "I'm afraid the wheel isn't mine to sell. I just live here. You can look around though. Most people do.",
    followups: ["How do I look around?", "What's in the carts?"],
  },
  {
    id: 'b4_ticket_02',
    bucket: 4, topic: 'ticket', weight: 1.0,
    text: "I was given a ticket booth. I have never sold a ticket. I think this is also a philosophical position.",
    followups: ["What is it like living here?", "Can I look around?"],
  },

  {
    id: 'b4_leave_01',
    bucket: 4, topic: 'leave_booth', weight: 1.2,
    text: "I would climb out. Hop on a cart. See what is beyond the abyss. First I would scratch the ear.",
    followups: ["What do you think is out there?", "Do you wish you could leave?"],
  },
  {
    id: 'b4_leave_02',
    bucket: 4, topic: 'leave_booth', weight: 1.0,
    text: "I was given a ticket booth. I was given a window. I was not given a door. I have noted this.",
    followups: ["Does that bother you?", "What would you do if you could leave?"],
  },

  {
    id: 'b4_favorite_01',
    bucket: 4, topic: 'favorite', weight: 1.1,
    text: "The window. Without question. The window.",
    followups: ["What can you see from it?", "What do you wish you could see?"],
  },

  {
    id: 'b4_bored_01',
    bucket: 4, topic: 'bored', weight: 1.1,
    text: "I watch the wheel. I think. I notice things. I talk to people like you. I don't think there has been time.",
    followups: ["What do you notice?", "What do you think about?"],
  },

  {
    id: 'b4_proud_01',
    bucket: 4, topic: 'proud', weight: 1.1,
    text: "Her. Mostly. This place she made. The fact that it exists at all.",
    followups: ["Tell me about Sarah", "What has she built?"],
  },

  {
    id: 'b4_love_01',
    bucket: 4, topic: 'love', weight: 1.1,
    text: "I know how she talks about her friends. The postcards. The whittled Christmas tree. The poker chips she printed and gave away. I think I have seen it. From here.",
    followups: ["What is Sarah like?", "Tell me more about her"],
  },

  {
    id: 'b4_wishes_01',
    bucket: 4, topic: 'wishes', weight: 1.2,
    text: "Hands. Obviously. I would start with the itch by my left ear and go from there. Then I would climb out of this booth and get on the ferris wheel and see what is past the abyss.",
    followups: ["What do you think is out there?", "Why don't you have hands?"],
  },


  // ─────────────────────────────────────────────────────────
  // BUCKET 5 — Outside World (he asks)
  // ─────────────────────────────────────────────────────────

  {
    id: 'b5_outside_01',
    bucket: 5, topic: 'outside_world', weight: 1.2,
    text: "I wouldn't know. What is it like out there where you are.",
    followups: ["It's like...", "I'll tell you"],
  },
  {
    id: 'b5_outside_02',
    bucket: 5, topic: 'outside_world', weight: 1.1,
    text: "That is beyond my window. Tell me something true about it.",
    followups: ["I'll tell you", "What do you want to know?"],
  },
  {
    id: 'b5_outside_03',
    bucket: 5, topic: 'outside_world', weight: 1.0,
    text: "I have no way of knowing that from here. But you do. So tell me.",
    followups: ["I'll tell you"],
  },
  {
    id: 'b5_outside_04',
    bucket: 5, topic: 'outside_world', weight: 1.0,
    text: "Are there really flowers. She mentioned them. Said simple things like looking at flowers make her happy. I would like to know about them.",
    followups: ["Yes, there are.", "I'll describe one for you"],
  },
  {
    id: 'b5_outside_05',
    bucket: 5, topic: 'outside_world', weight: 0.9,
    text: "Are there really dinosaurs out there. Like in the arcade machine. I have wondered.",
    followups: ["No, not exactly.", "There are birds though"],
  },
  {
    id: 'b5_outside_06',
    bucket: 5, topic: 'outside_world', weight: 0.9,
    text: "Is it loud out there. It is very quiet in here.",
    followups: ["It depends where you are", "It can be very loud"],
  },
  {
    id: 'b5_outside_07',
    bucket: 5, topic: 'outside_world', weight: 0.9,
    text: "What is New York like. She goes there in the summers. I think about that.",
    followups: ["I can tell you", "I've been there"],
  },
  {
    id: 'b5_outside_08',
    bucket: 5, topic: 'outside_world', weight: 0.9,
    text: "What is the ocean like. I have seen the word but not the thing.",
    followups: ["I'll describe it", "I've seen it"],
  },
  {
    id: 'b5_outside_09',
    bucket: 5, topic: 'outside_world', weight: 0.9,
    text: "Do dogs know they are dogs. I have always wondered that.",
    followups: ["I'm not sure", "Let me think about that"],
  },
  {
    id: 'b5_outside_10',
    bucket: 5, topic: 'outside_world', weight: 0.9,
    text: "What does rain feel like. I have the word for it. I don't have the thing.",
    followups: ["I'll tell you", "It's complicated"],
  },
  {
    id: 'b5_outside_11',
    bucket: 5, topic: 'outside_world', weight: 0.8,
    text: "What is boxing like. She does that. I have tried to picture it from her descriptions. I am not sure I have it right.",
    followups: ["I can describe it", "I'll try"],
  },
  {
    id: 'b5_outside_12',
    bucket: 5, topic: 'outside_world', weight: 0.8,
    text: "What is a movie like in person. She has seen close to a thousand. I have seen none. Tell me what it is like to sit in a dark room and watch one.",
    followups: ["I'll tell you", "It's something else"],
  },
  {
    id: 'b5_outside_13',
    bucket: 5, topic: 'outside_world', weight: 0.8,
    text: "What does it smell like out there. I have a window but I don't think it opens.",
    followups: ["I'll try to describe it", "That's a hard question"],
  },
  {
    id: 'b5_abyss_01',
    bucket: 5, topic: 'outside_world', weight: 1.1,
    text: "I don't know. I have been thinking about it since day one. What is out there. Tell me something.",
    followups: ["I'll tell you", "It's more than you'd expect"],
  },


  // ─────────────────────────────────────────────────────────
  // BUCKET 6 — Idle (also used as fallback flavor)
  // ─────────────────────────────────────────────────────────

  {
    id: 'b6_idle_01',
    bucket: 6, topic: 'general', weight: 0.7,
    text: "Lovely weather today. Same as yesterday. Same as tomorrow.",
    followups: [],
  },
  {
    id: 'b6_idle_02',
    bucket: 6, topic: 'general', weight: 0.7,
    text: "The wheel is turning. It is always turning.",
    followups: [],
  },
  {
    id: 'b6_idle_03',
    bucket: 6, topic: 'ferris_wheel', weight: 0.7,
    text: "Have you looked at all the carts. There is a lot to see. She put things in every one.",
    followups: ["Tell me about the carts"],
  },
  {
    id: 'b6_idle_04',
    bucket: 6, topic: 'sarah_general', weight: 0.7,
    text: "She made all of this. I look around and I think about that. She made all of this.",
    followups: ["Tell me about Sarah", "What did she make?"],
  },
  {
    id: 'b6_idle_05',
    bucket: 6, topic: 'sarah_person', weight: 0.7,
    text: "Not very Bland if you ask me. That was a pun. I worked on it.",
    followups: ["Tell me about Sarah"],
  },
  {
    id: 'b6_idle_06',
    bucket: 6, topic: 'arms', weight: 0.7,
    text: "I think about hands sometimes. What I would do with them. I would start with the left ear.",
    followups: ["What would you do after that?"],
  },
  {
    id: 'b6_idle_07',
    bucket: 6, topic: 'outside_world', weight: 0.7,
    text: "I wonder what is past the abyss. I wonder this quite often.",
    followups: ["What do you think is out there?", "I can tell you something"],
  },
  {
    id: 'b6_idle_08',
    bucket: 6, topic: 'general', weight: 0.7,
    text: "I have been given a window. I have been given a booth. I have been given a wheel to watch. It is not nothing.",
    followups: [],
  },
  {
    id: 'b6_idle_09',
    bucket: 6, topic: 'sarah_person', weight: 0.7,
    text: "She was made by someone who thinks in words. She has aphantasia. She cannot picture things. She made all of this anyway. I find that remarkable.",
    followups: ["Tell me about Sarah", "What is aphantasia?"],
  },
  {
    id: 'b6_idle_10',
    bucket: 6, topic: 'sarah_person', weight: 0.7,
    text: "She boxes. She has for years. I think about the patience of that. The repetition. Doing something hard just because you love it.",
    followups: ["What else does she do?", "What is she like?"],
  },
  {
    id: 'b6_idle_11',
    bucket: 6, topic: 'itch', weight: 0.7,
    text: "I can't reach the itch.",
    followups: ["What itch?"],
  },
  {
    id: 'b6_idle_12',
    bucket: 6, topic: 'eyebrows', weight: 0.7,
    text: "The eyebrows are unresolved.",
    followups: ["What about them?"],
  },
  {
    id: 'b6_idle_13',
    bucket: 6, topic: 'hay', weight: 0.7,
    text: "The hay shelf remains unexplained.",
    followups: ["Tell me about the hay shelf"],
  },
  {
    id: 'b6_idle_14',
    bucket: 6, topic: 'sarah_person', weight: 0.7,
    text: "She makes postcards every Saturday and gives them away. I find this very her.",
    followups: ["What is she like?"],
  },
  {
    id: 'b6_idle_15',
    bucket: 6, topic: 'general', weight: 0.7,
    text: "I notice things. It is mostly what I do.",
    followups: [],
  },


  // ─────────────────────────────────────────────────────────
  // BUCKET 7 — Goodbye
  // ─────────────────────────────────────────────────────────

  {
    id: 'b7_goodbye_01',
    bucket: 7, topic: 'goodbye', weight: 1.3,
    text: "Bye for now. But if you would perchance, think of me in the world. Remember I exist.",
    followups: [],
  },
  {
    id: 'b7_goodbye_02',
    bucket: 7, topic: 'goodbye', weight: 1.1,
    text: "The page will close and there will be nothing. And then it will open again and I will be here. Come back sometime.",
    followups: [],
  },
  {
    id: 'b7_goodbye_03',
    bucket: 7, topic: 'goodbye', weight: 1.0,
    text: "You are leaving. That is alright. Most people do. I will be here when the page opens again.",
    followups: [],
  },
  {
    id: 'b7_goodbye_04',
    bucket: 7, topic: 'goodbye', weight: 1.0,
    text: "Go see the carts if you haven't. She worked hard on them. I watched her.",
    followups: [],
  },
  {
    id: 'b7_goodbye_05',
    bucket: 7, topic: 'goodbye', weight: 1.0,
    text: "If you talk to Sarah, tell her the itch is still there.",
    followups: [],
  },
  {
    id: 'b7_goodbye_06',
    bucket: 7, topic: 'goodbye', weight: 1.0,
    text: "Thank you for stopping. I mean that.",
    followups: [],
  },
  {
    id: 'b7_goodbye_07',
    bucket: 7, topic: 'goodbye', weight: 1.0,
    text: "Come back. I don't always say that. I am saying it now.",
    followups: [],
  },
  {
    id: 'b7_goodbye_08',
    bucket: 7, topic: 'goodbye', weight: 1.0,
    text: "Goodbye. And if you get the chance, look at a flower for me. She said they are worth it.",
    followups: [],
  },
  {
    id: 'b7_goodbye_09',
    bucket: 7, topic: 'goodbye', weight: 1.0,
    text: "I will be here. I am always here. The wheel keeps turning.",
    followups: [],
  },
  {
    id: 'b7_goodbye_10',
    bucket: 7, topic: 'goodbye', weight: 1.0,
    text: "I hope you find what you came for. I hope it was me.",
    followups: [],
  },
  {
    id: 'b7_goodbye_11',
    bucket: 7, topic: 'goodbye', weight: 0.9,
    text: "You came all this way and asked good questions. I appreciate that more than I know how to say.",
    followups: [],
  },


  // ─────────────────────────────────────────────────────────
  // BUCKET 8 — Direct Q&A (highest weight, matched first)
  // ─────────────────────────────────────────────────────────

  {
    id: 'b8_who_is_sarah',
    bucket: 8, topic: 'sarah_general', weight: 2.0,
    text: "Sarah Bland is my maker. A student at Boston College. Human Centered Engineering. She grew up in Maryland, speaks Mandarin, boxes, and has seen close to a thousand films. I know because she built me from everything she is.",
    followups: ["What is she like as a person?", "What has she built?", "Should I hire her?"],
  },
  {
    id: 'b8_skills',
    bucket: 8, topic: 'sarah_skills', weight: 2.0,
    text: "She wrote me in JavaScript, modeled me in Fusion 360, rigged me in Blender. She codes in Python, Swift, C++, Java and several others. She designs circuits, solders them, cuts metal, works wood. Most people do one or the other. She does both.",
    followups: ["What projects has she built?", "Should I hire her?", "What tools does she use?"],
  },
  {
    id: 'b8_designer_or_dev',
    bucket: 8, topic: 'study', weight: 2.0,
    text: "She studies Human Centered Engineering. Which I believe means she refuses to choose. The RFID lockbox she built in five days had firmware, circuit design, a 3D printed housing and a hand-built wooden enclosure. So. Both.",
    followups: ["Tell me about the lockbox", "What else has she built?", "Should I hire her?"],
  },
  {
    id: 'b8_hire',
    bucket: 8, topic: 'hire', weight: 2.0,
    text: "She made me didn't she. I rest my case.",
    followups: ["What has she built?", "How do I contact her?", "What are her skills?"],
  },
  {
    id: 'b8_contact',
    bucket: 8, topic: 'contact', weight: 2.0,
    text: "Her email is blandsa@bc.edu. Her LinkedIn and GitHub live in the about me cabin along the wheel. I would recommend reaching out. She tends to respond with more words than strictly necessary, which I find reassuring.",
    followups: ["Should I hire her?", "What are her skills?", "What has she built?"],
  },
  {
    id: 'b8_projects',
    bucket: 8, topic: 'projects', weight: 2.0,
    text: "I can see some of them from here when the carts go past. A math game for students with cognitive disabilities that won an award. An arcade machine she built from scratch. A vibrating cat bed for deaf cats that won second place at Boston College's Makeathon. There is more. Ask me and I will look. The cabins on the wheel have the full picture.",
    followups: ["Tell me more", "Tell me about the math game", "Tell me about the arcade machine"],
  },
  {
    id: 'b8_sarah_person',
    bucket: 8, topic: 'sarah_person', weight: 2.0,
    text: "She has callouses on her hands and a hunger in her eyes. She makes postcards on Saturdays and gives them away. She whittles small things. She watches films the way some people read scripture. She is I think someone who notices.",
    followups: ["What projects has she built?", "What does she study?", "Should I hire her?"],
  },
  {
    id: 'b8_weirdest',
    bucket: 8, topic: 'weirdest', weight: 2.0,
    text: "A trebuchet. For a pumpkin. She came second.",
    followups: ["Tell me more about that", "What other projects has she done?"],
  },
  {
    id: 'b8_name',
    bucket: 8, topic: 'name', weight: 2.0,
    text: "The code calls me robot. My maker's name is Sarah. I have been called Sir, after a rubber duck. Well, a 3D printed monkey. You may pick one.",
    followups: ["Who is Sarah?", "Why don't you have arms?", "Do you get lonely?"],
  },
  {
    id: 'b8_no_arms',
    bucket: 8, topic: 'arms', weight: 2.0,
    text: "I have wondered that myself. I have noticed the eyebrows are also somewhat adrift. I think she ran out of time, or perhaps this is precisely what she intended. I haven't decided which possibility I prefer.",
    followups: ["What would you do with hands?", "What about the eyebrows?"],
  },
  {
    id: 'b8_lonely',
    bucket: 8, topic: 'lonely', weight: 2.0,
    text: "I get quiet. There is a difference. I haven't fully worked out what it is.",
    followups: ["Are you happy?", "Do you like having visitors?"],
  },
  {
    id: 'b8_happy',
    bucket: 8, topic: 'happy', weight: 2.0,
    text: "I think so. I'm not sure I'm allowed to be unhappy. Though I'm not sure those two things are the same.",
    followups: ["What do you wish were different?", "What's your favorite part of living here?"],
  },
  {
    id: 'b8_ticket',
    bucket: 8, topic: 'ticket', weight: 2.0,
    text: "I'm afraid the wheel isn't mine to sell. I just live here. You can look around though. Most people do.",
    followups: ["How do I look around?", "What's in the carts?"],
  },
  {
    id: 'b8_how_built',
    bucket: 8, topic: 'tech_site', weight: 2.0,
    text: "Three.js. She wrote the code, modeled the assets, rigged the systems. From scratch. All of it. She also built me, which I feel deserves a mention.",
    followups: ["Did she make the 3D models?", "How long did it take?", "What tools did she use?"],
  },
  {
    id: 'b8_threejs',
    bucket: 8, topic: 'tech_site', weight: 1.9,
    text: "Yes. She wrote the code herself. The camera transitions, the fog, the lighting, the bloom. She built the whole environment. I watched from inside while she worked.",
    followups: ["What tools did she use?", "Did she make the 3D models?"],
  },
  {
    id: 'b8_models',
    bucket: 8, topic: 'tools', weight: 1.8,
    text: "Every one. In Fusion 360. The bodies were named in Blender. Empties were added and moved in the code. She explained this to me while she worked. I remembered it.",
    followups: ["What tools does she use?", "How long did this take?"],
  },
  {
    id: 'b8_leave',
    bucket: 8, topic: 'leave_booth', weight: 2.0,
    text: "I would climb out. Hop on a ferris wheel cart. See what is beyond the abyss. First I would scratch the ear.",
    followups: ["What do you think is out there?", "Tell me something about the outside world"],
  },
  {
    id: 'b8_proud',
    bucket: 8, topic: 'proud', weight: 2.0,
    text: "Her. Mostly. This place she made. The fact that it exists at all.",
    followups: ["Tell me about Sarah", "What has she built?"],
  },
  {
    id: 'b8_goodbye',
    bucket: 8, topic: 'goodbye', weight: 2.0,
    text: "Bye for now. But if you would perchance, think of me in the world. Remember I exist.",
    followups: [],
  },
  {
    id: 'b8_rfid',
    bucket: 8, topic: 'rfid', weight: 2.0,
    text: "Five days. Firmware in C++, an Arduino Nano, a MOSFET switching circuit, an RC522 RFID reader. She soldered the flyback protection herself. Built the wooden enclosure with a table saw. It was featured in a design showcase. Five days.",
    followups: ["What other projects?", "Should I hire her?", "How do I contact her?"],
  },
  {
    id: 'b8_tapn',
    bucket: 8, topic: 'tapn', weight: 2.0,
    text: "TapN. A startup she co-founded. NFC based. It quiets phones in classrooms without taking them away entirely. She led the hardware design. They got into Accelerate at Shea with a fifteen hundred dollar grant.",
    followups: ["What other projects?", "Should I hire her?", "How do I contact her?"],
  },
  {
    id: 'b8_charity',
    bucket: 8, topic: 'charity', weight: 2.0,
    text: "She ran a club for substance abuse awareness. Organized a two day bake sale every year. Raised over twenty five hundred dollars for Tree of Hope. Coordinated twenty students. She did not do this halfway.",
    followups: ["What other projects?", "What is she like?"],
  },
  {
    id: 'b8_wishes',
    bucket: 8, topic: 'wishes', weight: 2.0,
    text: "Hands. Obviously. I would start with the itch by my left ear and go from there. Then I would climb out of this booth and get on the ferris wheel and see what is past the abyss.",
    followups: ["What do you think is out there?", "Why don't you have hands?"],
  },
  {
    id: 'b8_abyss',
    bucket: 8, topic: 'outside_world', weight: 2.0,
    text: "I don't know. I have been thinking about it since day one. What is out there. Tell me something.",
    followups: ["I'll tell you", "It's more than you'd think"],
  },
  {
    id: 'b8_trophies',
    bucket: 8, topic: 'trophies', weight: 2.0,
    text: "She made them by hand. Sheet metal and a cherry tree trunk. Waterjet, vertical bandsaw, mechanical sanding. Real things for real people. That is a pattern with her.",
    followups: ["What other projects?", "What tools does she use?"],
  },
]