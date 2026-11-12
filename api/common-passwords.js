// Passwords refused at sign-up and reset (api/index.js weakPassword; the research loop's P-101, November 2026: NIST SP 800-63B
// asks for a blocklist of common, expected or compromised passwords). The most common of the leaked lists, as they are
// remembered, written out by hand: only those of 8 characters or more, the shorter being refused by length already. Also
// refused, by rule: one character or a short run repeated, a run of letters, digits or keys in a row, and the username.
// Lowercase: a password is compared in lowercase.

const COMMON_PASSWORDS = new Set(`
password password1 password12 password123 password1234 password12345 password! password01 password02 password11 password2
password22 password3 password7 password99 passwords password2023 password2024 password2025 password2026 passw0rd passw0rd1
p@ssw0rd p@ssword p@55w0rd pa55word pa55w0rd pa$$word p4ssw0rd pass1234 pass12345 passpass passwd123 1password mypassword
mypass123 newpassword yourpassword thepassword secretpassword passwort motdepasse contrasena wachtwoord salasana
12345678 123456789 1234567890 12345678910 0123456789 0987654321 09876543 98765432 87654321 123123123 12341234 11223344
11111111 00000000 22222222 88888888 99999999 12121212 123321123 1234554321 123454321 147258369 159753456 741852963
963852741 147852369 159357456 13579246 24682468 4815162342 123456789a 12345678a 1234567a a1234567 a12345678 aa123456
abc12345 abcd1234 abcde123 abcdefgh abc123456 abc123abc a1b2c3d4 1a2b3c4d q1w2e3r4 q1w2e3r4t5 1q2w3e4r 1q2w3e4r5t 1qaz2wsx
1qazxsw2 zaq12wsx zaq1zaq1 zaq1xsw2 qazwsxedc qweasdzxc 123qweasd 123qweasdzxc qwe123qwe qwer1234 1234qwer qwerty123
qwerty12 qwerty1234 qwertyui qwertyuiop qwerty12345 qwertyqwerty qwerasdf asdfghjk asdfghjkl asdf1234 asdfasdf a1s2d3f4
zxcvbnm1 zxcvbnm123 zxcvbnma 1234asdf
iloveyou iloveyou1 iloveyou2 iloveyou! iloveu123 iloveme1 loveyou1 lovelove loveme12 lovely12 lovelife sweetheart
sunshine sunshine1 princess princess1 princess12 princesa babygirl babygirl1 butterfly butterfly1 chocolate chocolate1
cocacola flower123 sunflower rainbow1 starlight moonlight midnight blueberry strawberry pineapple cupcake1 cheese123
cookie123 cookies1 bubblegum
football football1 baseball baseball1 basketball soccer12 soccer123 hockey12 tennis12 volleyball liverpool liverpool1
chelsea1 arsenal1 manchester manutd99 barcelona realmadrid juventus yankees1 cowboys1 steelers lakers24 jordan23
superman superman1 batman123 spiderman ironman1 starwars starwars1 darthvader skywalker pokemon1 pokemon123 pikachu1
dragonball naruto123 minecraft minecraft1 fortnite fortnite1 roblox123 runescape runescape1 oldschool warcraft
worldofwarcraft diablo123 nintendo playstation gameboy1 gamer123 gaming123 player123 wizard123 dragonslayer
knight123 warrior1 legend12 legendary champion champion1 dragon12 dragon123 dragons1 monster1 monster123 shadow12 shadow123
killer123 hunter12 hunter123 ranger12 master12 master123 mastermind
trustno1 whatever whatever1 welcome1 welcome12 welcome123 welcome! letmein1 letmein123 letmein! changeme changeme1
computer computer1 internet internet1 secret12 secret123 helloworld hello123 hello1234 hellokitty goodluck freedom1
blahblah blink182 metallica nirvana1 linkinpark eminem123
michelle jennifer jessica1 michael1 charlie1 jonathan alexander christian christopher elizabeth jasmine1 samantha
victoria nicole12 natasha1 danielle brandon1 matthew1 joshua12 andrew12 robert12 thomas12 william1 richard1 patricia
jackson1 anthony1 justin123 angel123 angelina tigger12 snoopy12 scooter1 maverick
corvette mercedes ferrari1 porsche1 mustang1 chevrolet harleydavidson
administrator admin123 admin1234 admin12345 adminadmin root1234 rootroot toor1234 test1234 test12345 testtest testing1
testing123 guest123 default1 user1234 username password1! qwerty1!
samsung1 iphone12 apple123 google123 facebook facebook1 linkedin twitter1 youtube1 instagram spotify1 netflix1
microsoft windows1 windows7 windows10
newyork1 london12 pakistan pakistan123 india123 bangladesh australia philippines indonesia
summer2023 summer2024 summer2025 summer2026 winter2023 winter2024 winter2025 winter2026 spring2025 spring2026 autumn2025
january1 december1 monday123 september
justinbieber onedirection
fantasyidle fantasyidle1 fantasy1 fantasy123 idlegame idlegames melvoridle
`.trim().split(/\s+/));

module.exports = { COMMON_PASSWORDS };
