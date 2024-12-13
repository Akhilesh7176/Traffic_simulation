import * as Papa from "papaparse";
import proj4 from "proj4";

// Define the UTM projection for Zone 32N (Rozzano, Milan, Italy)
const utmProj = "+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs";

// Define the WGS84 geographic coordinate system (latitude and longitude)
const wgs84Proj = "+proj=longlat +datum=WGS84 +no_defs";

// Declare the variable at the module level
export let changed_utm_coords: [
  number,
  number,
  number,
  number,
  number,
  string,
  number,
  number
][] = [];

export async function main() {
  try {
    // Use fetch to read the CSV file (from the public folder)
    const response = await fetch("/public/output_data.csv");

    const data = await response.text(); // Read file content as text

    // Parse the CSV data synchronously
    interface CsvRow {
      "x[m]": string;
      "y[m]": string;
      [key: string]: any;
    }

    const results = Papa.parse<CsvRow>(data, {
      header: true,
      skipEmptyLines: true,
    });

    // Initialize arrays to hold x, y, and z values
    const x: number[] = [];
    const y: number[] = [];
    const z: number[] = [];
    const vehicle_id: number[] = [];
    const time: number[] = [];
    const flw_type: string[] = [];
    const speed: number[] = [];
    const f_error: number[] = [];

    // Extract data from the parsed results
    results.data.forEach((row) => {
      x.push(parseFloat(row["x[m]"]));
      y.push(parseFloat(row["y[m]"]));
      z.push(0.02); // Adjust 'z' value as needed
      vehicle_id.push(parseFloat(row["vehicle_id"]));
      time.push(parseFloat(row["Time [s]"]));
      flw_type.push(row["flw_type"]);
      speed.push(parseFloat(row["Speed [km/h]"]));
      f_error.push(parseFloat(row["f_error"]));
    });

    console.log("Check f error - ", f_error[0]);
    const utm_coords_raw: [
      number,
      number,
      number,
      number,
      number,
      string,
      number,
      number
    ][] = x.map((val, index) => [
      val, // x coordinate
      y[index], // y coordinate
      z[index], // z coordinate
      vehicle_id[index], // vehicle ID
      time[index], // time
      flw_type[index],
      speed[index],
      f_error[index],
    ]);

    // Function to convert UTM to latitude and longitude
    function convertUtmToLatLong(
      utmCoords: [
        number,
        number,
        number,
        number,
        number,
        string,
        number,
        number
      ][]
    ): [number, number, number, number, number, string, number, number][] {
      return utmCoords.map(
        ([x, y, z, vehicleId, timestamp, flw_type, speed, f_error]) => {
          const [lon, lat] = proj4(utmProj, wgs84Proj, [x, y]);
          return [lat, lon, z, vehicleId, timestamp, flw_type, speed, f_error];
        }
      );
    }

    // Convert UTM coordinates to latitude and longitude
    changed_utm_coords = convertUtmToLatLong(utm_coords_raw);

    return changed_utm_coords;
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

await main();
