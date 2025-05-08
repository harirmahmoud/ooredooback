const express = require("express");
const cors = require("cors");
const app = express();


function toRadians(degrees) {
    return degrees * Math.PI / 180;
}


function calculateAzimuth(lat1, lon1, lat2, lon2) {
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const λ1 = toRadians(lon1);
    const λ2 = toRadians(lon2);

    // Calcul de la différence de longitude
    const Δλ = λ2 - λ1;

    // Calcul de l'azimut
    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    // L'azimut est l'angle entre l'axe nord et la ligne reliant les deux points
    let azimuth = Math.atan2(x, y);  // atan2 retourne l'angle en radians

    // Convertir en degrés
    azimuth = azimuth * 180 / Math.PI;

    // Normaliser l'azimut dans l'intervalle [0, 360] degrés
    if (azimuth < 0) {
        azimuth += 360;
    }

    return azimuth;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en kilomètres
}
app.use(cors());
app.use(express.json());
const db=require('./models')
db.sequelize.sync({ alter: true });

const {Sites}=require('./models'); // ✅ Correctly reference Sites from db
const { where } = require("sequelize");

app.post('/insert', async(req, res) => {
    const data = req.body;
    const inserted = [];

    try {
        for (let item of data) {
            const keys = Object.keys(item);

            const site = await Sites.create({
                site_number: item[keys[0]],
                site_name: item[keys[1]],
                farEnd: item[keys[2]],
                azimut: item[keys[3]],
                hba: item[keys[4]],
                distance: item[keys[5]],
                nombre_antenne: item[keys[6]],
                
                longitude: item[keys[8]],
                latitude: item[keys[9]],
                elevation: item[keys[10]],
                adresse: item[keys[11]],
                building_heigh: item[keys[12]],
                tower_high: item[keys[13]],
                site_type: item[keys[14]],
                site_state: item[keys[15]],
                Antenne:item[keys[7]],
            });

            inserted.push(site);
        }

        // Send response after all inserts are done
        res.status(201).json({ message: "All data inserted", inserted });
    } catch (e) {
        console.error("Insert failed:", e);
        res.status(500).json({ error: "Insert failed", details: e.message });
    
    }
    
});

app.post('/new',async(req, res) => {
    const data = req.body;
    console.log("Received body:", data);

    if (!data.FarEnd || data.longitude === undefined || data.latitude === undefined) {
        return res.status(400).json({ error: 'FarEnd, longitude, and latitude are required in the request body' });
    }

    try {
        const site = await Sites.findAll({
         
            where: {
                site_number: data.FarEnd
            }
        });

        if (!site.length) {
            console.log("No site found for site_number:", data.FarEnd);
            return res.status(404).json({ error: 'No site found with the given site_number' });
        }

        const siteLng = parseFloat(site[0].longitude);
        const siteLat = parseFloat(site[0].latitude);
        const userLng = parseFloat(data.longitude);
        const userLat = parseFloat(data.latitude);

        // Log the types of the values
        console.log("Parsed Site Longitude:", siteLng, "Parsed Site Latitude:", siteLat);
        console.log("Parsed User Longitude:", userLng, "Parsed User Latitude:", userLat);

        // Check if any of the values are NaN
        if (isNaN(siteLng) || isNaN(siteLat) || isNaN(userLng) || isNaN(userLat)) {
            return res.status(400).json({ error: 'One or more coordinates are invalid' });
        }

        // Calculate distance
        const dis = haversineDistance(siteLat,siteLng,userLat,userLng)
        const azimuth=calculateAzimuth(siteLat,siteLng,userLat,userLng)

        console.log("Formatted site result:", JSON.stringify(site, null, 2));
        console.log("Distance:", dis);
        const keys = Object.keys(data);
        const site1 = await Sites.create({
            site_number: data[keys[0]],
            site_name: data[keys[0]],
            farEnd: data[keys[1]],
            azimut: azimuth,
            hba: data[keys[2]],
            distance: dis,
            nombre_antenne: data[keys[3]],
            Antenne: data[keys[4]],
            longitude: data[keys[5]],
            latitude: data[keys[6]],
            elevation: data[keys[7]],
            adresse: data[keys[8]],
            building_heigh: data[keys[9]],
          
            tower_high: data[keys[10]],
            site_type: data[keys[11]],
            site_state: data[keys[12]]
        });
        const site2 = await Sites.create({
            site_number: site[0].site_number,
            site_name: site[0].site_name,
            farEnd: site[0].farEnd,
            azimut: (azimuth+180>=360?(azimuth-180):(azimuth+180)),
            hba: site[0].hba,
            distance: dis,
            nombre_antenne: site[0].nombre_antenne,
            Antenne: site[0].Antenne,
            longitude: site[0].longitude,
            latitude: site[0].latitude,
            elevation: site[0].elevation,
            adresse: site[0].adresse,
            building_heigh: site[0].building_heigh,
            tower_high: site[0].tower_high,
            site_type: site[0].site_type,
            site_state:site[0].site_state,
            
        });

        res.json({ distance: dis ,azimuth:azimuth});

    } catch (e) {
        console.error("Error during DB query:", e);
        res.status(500).json({ error: 'Database error', details: e.message });
    }
    const inserted = [];

    // try {
      
    //         const keys = Object.keys(item);

    //         const site = await Sites.create({
    //             site_number: item[keys[0]],
    //             site_name: item[keys[1]],
    //             farEnd: item[keys[2]],
    //             azimut: item[keys[3]],
    //             hba: item[keys[4]],
    //             distance: item[keys[5]],
    //             nombre_antenne: item[keys[6]],
    //             longitude: item[keys[7]],
    //             latitude: item[keys[8]],
    //             elevation: item[keys[9]],
    //             adresse: item[keys[10]],
    //             building_heigh: item[keys[11]],
    //             tower_high: item[keys[12]],
    //             site_type: item[keys[13]],
    //             site_state: item[keys[14]]
    //         });

    //         inserted.push(site);
      

    //     // Send response after all inserts are done
    //     res.status(201).json({ message: "All data inserted", inserted });
    // } catch (e) {
    //     console.error("Insert failed:", e);
    //     res.status(500).json({ error: "Insert failed", details: e.message });
    
    // }
    
})

app.get('/select',async (req,res)=>{
const site=await Sites.findAll();
res.send(site)
})
app.delete('/delete', async (req, res) => {
    try {
        const deletedCount = await Sites.destroy({ where: {} }); // Deletes all rows
        res.send(`${deletedCount} site(s) deleted!`);
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: "Failed to delete" });
    }
});

db.sequelize.sync().then(() => {
    app.listen(3000, () => {
        console.log("Listening on port 3000...");
    });
});
