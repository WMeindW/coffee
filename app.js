const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

// Nastavení připojení k databázi přímo v kódu
const db = mysql.createConnection({
    host: 'sql.daniellinda.net',
    user: 'remote',
    password: 'hm3C4iLL+',
    database: 'coffee'
});

// Připojení k databázi
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        return;
    }
    console.log('Connected to the MySQL database.');
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Funkce pro získání seznamu lidí
app.get('/getPeopleList', (req, res) => {
    db.query('SELECT * FROM people', (err, results) => {
        if (err) {
            res.status(500).json({ msg: 'Error fetching people list' });
            return;
        }
        res.json(results);
    });
});

// Funkce pro získání seznamu typů
app.get('/getTypesList', (req, res) => {
    db.query('SELECT * FROM types', (err, results) => {
        if (err) {
            res.status(500).json({ msg: 'Error fetching types list' });
            return;
        }
        res.json(results);
    });
});

// Funkce pro ukládání nápojů
app.post('/saveDrinks', (req, res) => {
    const data = req.body;

    // Získání informací z formuláře (uživatel a typy kávy)
    const selectedUser = data.user; // Očekávaný index uživatele
    const coffeeTypes = data.type;  // Pole s počty pro jednotlivé typy kávy

    // Nejprve získáme všechny uživatele a typy kávy z databáze
    const getUsersQuery = 'SELECT * FROM people';
    const getTypesQuery = 'SELECT * FROM types';

    db.query(getUsersQuery, (err, users) => {
        if (err) {
            console.error('Chyba při získávání uživatelů:', err);
            return res.status(500).json({ error: 'Chyba při získávání uživatelů' });
        }

        db.query(getTypesQuery, (err, types) => {
            if (err) {
                console.error('Chyba při získávání typů kávy:', err);
                return res.status(500).json({ error: 'Chyba při získávání typů kávy' });
            }

            // Najdeme vybraného uživatele
            const user = users[selectedUser];
            if (!user) {
                return res.status(400).json({ error: 'Neplatný uživatel' });
            }

            // Projdeme všechny typy kávy a vložíme ty, které mají více než 0
            const queries = coffeeTypes.map((amount, index) => {
                if (amount > 0) {
                    const coffeeType = types[index];
                    const insertQuery = `
                        INSERT INTO drinks (date, id_people, id_types)
                        VALUES (CURDATE(), ?, ?)
                    `;
                    return new Promise((resolve, reject) => {
                        db.query(insertQuery, [user.ID, coffeeType.ID], (err, result) => {
                            if (err) {
                                console.error('Chyba při ukládání nápojů:', err);
                                return reject(err);
                            }
                            resolve(result);
                        });
                    });
                }
            }).filter(Boolean);

            // Spuštění všech vkládacích dotazů
            Promise.all(queries)
                .then(() => {
                    res.status(200).json({ message: 'Data úspěšně uložena.' });
                })
                .catch(err => {
                    res.status(500).json({ error: 'Chyba při ukládání nápojů.' });
                });
        });
    });
});

// Statistika nápojů podle měsíce
// Endpoint pro získání shrnutí nápojů
app.get('/getSummaryOfDrinks', (req, res) => {
    const sql = `
        SELECT types.typ, COUNT(drinks.ID) AS pocet, people.name
        FROM drinks
                 JOIN types ON drinks.id_types = types.ID
                 JOIN people ON drinks.id_people = people.ID
        GROUP BY types.typ, people.name
        ORDER BY people.name
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Chyba při získávání shrnutí nápojů:', err);
            return res.status(500).json({ error: 'Chyba při získávání shrnutí nápojů' });
        }
        // Přetvoření dat na formát požadovaný front-endem
        const formattedResults = results.map(result => [result.typ, result.pocet, result.name]);
        res.json(formattedResults);
    });
});




// Start serveru
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
