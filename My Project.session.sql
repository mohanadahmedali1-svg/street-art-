CREATE TABLE IF NOT EXISTS location  (
    location_id INT NOT NULL,
    address     VARCHAR(255) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    CONSTRAINT pk_location PRIMARY KEY (location_id)
);

INSERT IGNORE INTO location VALUES
(1,  '15 Tahrir Square',        'Cairo'),
(2,  '88 Corniche El Nil',      'Cairo'),
(3,  '22 Mohamed Ali Street',   'Alexandria'),
(4,  '5 El Horreya Road',       'Alexandria'),
(5,  '10 El Gomhoreya Street',  'Giza'),
(6,  '33 Port Said Street',     'Port Said'),
(7,  '7 El Nasr Road',          'Mansoura'),
(8,  '19 Khalifa El Mamoun',    'Aswan'),
(9,  '44 El Thawra Street',     'Luxor'),
(10, '3 El Mahatta Square',     'Suez');


CREATE TABLE IF NOT EXISTS crew (
    crew_id   INT NOT NULL,
    crew_name VARCHAR(100) NOT NULL,
    base_city VARCHAR(100) NOT NULL,
    CONSTRAINT pk_crew PRIMARY KEY (crew_id)
);

INSERT IGNORE INTO crew VALUES
(1,  'Walls of Cairo',      'Cairo'),
(2,  'Nile Painters',       'Cairo'),
(3,  'Alex Street Art',     'Alexandria'),
(4,  'Delta Muralists',     'Mansoura'),
(5,  'Desert Canvas',       'Aswan'),
(6,  'Urban Pharaohs',      'Giza'),
(7,  'Port Colors',         'Port Said'),
(8,  'Luxor Legends',       'Luxor'),
(9,  'Suez Spray',          'Suez'),
(10, 'Red Sea Brushes',     'Hurghada');


CREATE TABLE IF NOT EXISTS artist (
    artist_id INT NOT NULL,
    handle    VARCHAR(100) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    crew_id   INT,
    CONSTRAINT pk_artist PRIMARY KEY (artist_id),
    CONSTRAINT uq_artist_handle UNIQUE (handle),
    CONSTRAINT fk_artist_crew FOREIGN KEY (crew_id)
        REFERENCES crew(crew_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

INSERT IGNORE INTO artist VALUES
(1,  'Zo_Art',      'Ziad Omar Khalil',      1),
(2,  'NileSpray',   'Nour Ahmed Hassan',     1),
(3,  'PhantomAlex', 'Karim Samir Farouk',    3),
(4,  'DesertBrush', 'Salma Youssef Naguib',  5),
(5,  'UrbanEye',    'Mohamed Tarek Sayed',   6),
(6,  'InkPharaoh',  'Omar Mahmoud Zakaria',  2),
(7,  'DeltaVibe',   'Yasmine Ali Ibrahim',   4),
(8,  'LuxorLines',  'Ahmed Hossam Fathi',    8),
(9,  'SuezSoul',    'Rania Khaled Mostafa',  9),
(10, 'RedCanvas',   'Hassan Emad Shawky',    10);


CREATE TABLE IF NOT EXISTS mural (
    mural_id INT NOT NULL,
    creation_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    location_id INT NOT NULL,
    CONSTRAINT pk_mural PRIMARY KEY (mural_id),
    CONSTRAINT chk_mural_status CHECK (status IN ('active','damaged','restored','removed')),
    CONSTRAINT fk_mural_location FOREIGN KEY (location_id)
        REFERENCES location(location_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

INSERT IGNORE INTO mural VALUES
(1,  '2021-03-15', 'active',   'Revolution of Colors',  1),
(2,  '2020-07-20', 'restored', 'The Nile Never Sleeps',  2),
(3,  '2019-11-05', 'active',   'Alexandria Dreams',      3),
(4,  '2022-01-10', 'active',   'Pharaohs Rise',          6),
(5,  '2018-06-30', 'damaged',  'Desert Whispers',        8),
(6,  '2023-04-18', 'active',   'Port of Hopes',          6),
(7,  '2021-09-25', 'active',   'Delta Heartbeat',        7),
(8,  '2017-12-01', 'removed',  'Suez Memories',          10),
(9,  '2022-08-14', 'active',   'Luxor in Bloom',         9),
(10, '2023-11-22', 'active',   'Cairo Pulse',            2);


CREATE TABLE IF NOT EXISTS preservation_record (
    record_id INT NOT NULL,
    mural_id INT NOT NULL,
    description TEXT NOT NULL,
    CONSTRAINT pk_preservation PRIMARY KEY (record_id),
    CONSTRAINT fk_preservation_mural FOREIGN KEY (mural_id)
        REFERENCES mural(mural_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

INSERT IGNORE INTO preservation_record VALUES
(1, 2,  'Full repaint after flood damage in 2023'),
(2, 5,  'Surface cracking due to sandstorm exposure'),
(3, 8,  'Mural removed during road construction'),
(4, 1,  'Minor touch-up on lower left corner'),
(5, 3,  'Anti-graffiti coating applied'),
(6, 4,  'Color fading treated with UV protective layer'),
(7, 7,  'Partial restoration after wall damage'),
(8, 9,  'Full documentation and photography completed'),
(9, 6,  'Cleaning and grout repair performed'),
(10,10, 'New protective varnish layer applied');


CREATE TABLE IF NOT EXISTS place (
    crew_id INT NOT NULL,
    location_id INT NOT NULL,
    since DATE NOT NULL,
    CONSTRAINT pk_place PRIMARY KEY (crew_id, location_id),
    CONSTRAINT fk_place_crew FOREIGN KEY (crew_id)
        REFERENCES crew(crew_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_place_location FOREIGN KEY (location_id)
        REFERENCES location(location_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

INSERT IGNORE INTO place VALUES
(1, 1,  '2018-05-01'),
(2, 2,  '2019-03-15'),
(3, 3,  '2017-08-20'),
(4, 7,  '2020-11-10'),
(5, 8,  '2016-06-25'),
(6, 5,  '2021-01-30'),
(7, 6,  '2019-09-05'),
(8, 9,  '2015-04-12'),
(9, 10, '2022-07-18'),
(10,4,  '2023-02-28');


CREATE TABLE IF NOT EXISTS include (
    artist_id INT NOT NULL,
    mural_id INT NOT NULL,
    role VARCHAR(100) NOT NULL,
    CONSTRAINT pk_include PRIMARY KEY (artist_id, mural_id),
    CONSTRAINT chk_include_role CHECK (role IN ('lead','assistant','designer','painter')),
    CONSTRAINT fk_include_artist FOREIGN KEY (artist_id)
        REFERENCES artist(artist_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_include_mural FOREIGN KEY (mural_id)
        REFERENCES mural(mural_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

INSERT IGNORE INTO include VALUES
(1,1,'lead'),
(2,1,'assistant'),
(3,3,'lead'),
(4,5,'designer'),
(5,4,'lead'),
(6,10,'painter'),
(7,7,'lead'),
(8,9,'designer'),
(9,8,'painter'),
(10,6,'assistant');


CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO users (username, password, role) VALUES
('admin','amP4jWdYFYDF0JC6m7WXbumnFczXDOo8QlezI5gzFX8dRM8cfz3Zq','admin'),
('editor','amP4jWdYFYDF0JC6m7WXbumnFczXDOo8QlezI5gzFX8dRM8cfz3Zq','editor'),
('viewer','amP4jWdYFYDF0JC6m7WXbumnFczXDOo8QlezI5gzFX8dRM8cfz3Zq','viewer');


SELECT * FROM mural;