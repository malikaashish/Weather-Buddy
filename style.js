
// all element selectors
const temp = document.getElementById("temp"),
  date = document.getElementById("date-time"),
  condition = document.getElementById("condition"),
  rain = document.getElementById("rain"),
  mainIcon = document.getElementById("icon"),
  currentLocation = document.getElementById("location"),
  uvIndex = document.querySelector(".uv-index"),
  uvText = document.querySelector(".uv-text"),
  windSpeed = document.querySelector(".wind-speed"),
  sunRise = document.querySelector(".sun-rise"),
  sunSet = document.querySelector(".sun-set"),
  humidity = document.querySelector(".humidity"),
  visibilty = document.querySelector(".visibilty"),
  humidityStatus = document.querySelector(".humidity-status"),
  airQuality = document.querySelector(".air-quality"),
  airQualityStatus = document.querySelector(".air-quality-status"),
  visibilityStatus = document.querySelector(".visibilty-status"),
  searchForm = document.querySelector("#search"),
  search = document.querySelector("#query"),
  celciusBtn = document.querySelector(".celcius"),
  fahrenheitBtn = document.querySelector(".fahrenheit"),
  tempUnit = document.querySelectorAll(".temp-unit"),
  hourlyBtn = document.querySelector(".hourly"),
  weekBtn = document.querySelector(".week"),
  weatherCards = document.querySelector("#weather-cards");

let currentCity = "Meerut";
let currentUnit = "c";
let hourlyorWeek = "week";

// Date and time
function getDateTime() {
  let now = new Date(),
    hour = now.getHours(),
    minute = now.getMinutes();
  let days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  hour = hour % 12 || 12;
  if (hour < 10) hour = "0" + hour;
  if (minute < 10) minute = "0" + minute;
  return `${days[now.getDay()]}, ${hour}:${minute}`;
}

date.innerText = getDateTime();
setInterval(() => (date.innerText = getDateTime()), 1000);

// Getting city coordinates(from open meto)
async function getCoordinates(city) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}`);
  const data = await res.json();
  if (!data.results) return null;
  return data.results[0]; // best match
}

// detecting location
function getPublicIp() {
  fetch("https://geolocation-db.com/json/")
    .then(res => res.json())
    .then(data => {
      if (data.city) {
        currentCity = data.city;
      }
      // else → keep Meerut as default 
      getWeatherData(currentCity, currentUnit, hourlyorWeek);
    })
    .catch(() => {
      getWeatherData(currentCity, currentUnit, hourlyorWeek);
    });
}
getPublicIp();


// main weather function using open-meteo
async function getWeatherData(city, unit, hourlyorWeek) {
  const location = await getCoordinates(city);
  if (!location) {
    alert("City not found");
    return;
  }

  currentLocation.innerText = location.name;

  const lat = location.latitude;
  const lon = location.longitude;

  const api = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,visibility,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&current_weather=true&timezone=auto`;

  const res = await fetch(api);
  const data = await res.json();

  const current = data.current_weather;

  // basic values
  let temperature = current.temperature;
  if (unit === "f") temperature = celciusToFahrenheit(temperature);

  temp.innerText = temperature;
  condition.innerText = getConditionText(current.weathercode);
  rain.innerText = "Perc - " + "0%";
  windSpeed.innerText = current.windspeed;
  humidity.innerText = data.hourly.relativehumidity_2m[0] + "%";
  visibilty.innerText = data.hourly.visibility[0];

  mainIcon.src = getIcon(current.weathercode);
  changeBackground(current.weathercode);

  // sunrise & sunset
  sunRise.innerText = formatTime(data.daily.sunrise[0]);
  sunSet.innerText = formatTime(data.daily.sunset[0]);

  // UV
  uvIndex.innerText = data.daily.uv_index_max[0];
  measureUvIndex(data.daily.uv_index_max[0]);

  // humidity status
  updateHumidityStatus(data.hourly.relativehumidity_2m[0]);

  // visibility status
  updateVisibiltyStatus(data.hourly.visibility[0]);

  // Air quality (fake mapping to wind direction)
  airQuality.innerText = current.winddirection || 50;
  updateAirQualityStatus(current.winddirection || 50);

  // Forecast update
  if (hourlyorWeek === "hourly") {
    updateForecast(data.hourly, unit, "day");
  } else {
    updateForecast(data.daily, unit, "week");
  }
}

// forecast cards
function updateForecast(data, unit, type) {
  weatherCards.innerHTML = "";

  let count = type === "day" ? 24 : 7;

  for (let i = 0; i < count; i++) {
    let card = document.createElement("div");
    card.classList.add("card");

    let name =
      type === "day"
        ? `${i}:00`
        : getDayName(data.time[i]);

    let tempVal =
      type === "day"
        ? data.temperature_2m[i]
        : data.temperature_2m_max[i];

    if (unit === "f") tempVal = celciusToFahrenheit(tempVal);

    let iconCode =
      type === "day" ? data.weathercode[i] : data.weathercode[i];

    card.innerHTML = `
      <h2 class="day-name">${name}</h2>
      <div class="card-icon">
        <img src="${getIcon(iconCode)}" class="day-icon" />
      </div>
      <div class="day-temp">
        <h2 class="temp">${tempVal}</h2>
        <span class="temp-unit">°${unit.toUpperCase()}</span>
      </div>
    `;
    weatherCards.appendChild(card);
  }
}

// icon mapping according to condition
function getIcon(code) {
  if (code === 0) return "./icons/sun/26.png"; // clear
  if (code === 1 || code === 2) return "./icons/sun/27.png"; // partly cloudy
  if (code === 3) return "./icons/moon/15.png"; // cloudy
  if (code >= 51 && code <= 67) return "./icons/rain/39.png"; // drizzle/rain
  if (code >= 71 && code <= 77) return "./icons/rain/39.png"; // snow
  if (code >= 95) return "./icons/sun/39.png"; // storm
  return "./icons/sun/27.png";
}

// condition label
function getConditionText(code) {
  const map = {
    0: "Clear Sky",
    1: "Partly Cloudy",
    2: "Partly Cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Fog",
    51: "Drizzle",
    61: "Rain",
    71: "Snow",
    95: "Thunderstorm"
  };
  return map[code] || "Unknown";
}

// updating background
function changeBackground(code) {
  const body = document.querySelector("body");
  let bg = "./images/pc.jpg"; 

  if (code === 0) bg = "./images/cd.jpg";
  else if (code === 3) bg = "./images/pc.jpg";
  else if (code === 45) bg = "./images/cn.jpg";
  else if (code >= 51) bg = "./images/rain.jpg";

  body.style.backgroundImage =
    `linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)), url(${bg})`;
}

// utility functions
function celciusToFahrenheit(t) {
  return ((t * 9) / 5 + 32).toFixed(1);
}

function getDayName(dateStr) {
  let date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function formatTime(dateTime) {
  let t = new Date(dateTime);
  return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function measureUvIndex(uv) {
  if (uv <= 2) uvText.innerText = "Low";
  else if (uv <= 5) uvText.innerText = "Moderate";
  else if (uv <= 7) uvText.innerText = "High";
  else uvText.innerText = "Very High";
}

function updateHumidityStatus(h) {
  if (h <= 30) humidityStatus.innerText = "Low";
  else if (h <= 60) humidityStatus.innerText = "Normal";
  else humidityStatus.innerText = "High";
}

function updateVisibiltyStatus(v) {
  if (v < 1000) visibilityStatus.innerText = "Foggy";
  else if (v < 5000) visibilityStatus.innerText = "Mist";
  else visibilityStatus.innerText = "Clear";
}

function updateAirQualityStatus(aq) {
  if (aq <= 50) airQualityStatus.innerText = "Good";
  else airQualityStatus.innerText = "Moderate";
}

// seach form
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  let location = search.value;
  if (location) {
    currentCity = location;
    getWeatherData(location, currentUnit, hourlyorWeek);
  }
});

// unit change (degree-fahren.)
fahrenheitBtn.addEventListener("click", () => changeUnit("f"));
celciusBtn.addEventListener("click", () => changeUnit("c"));

function changeUnit(unit) {
  if (currentUnit !== unit) {
    currentUnit = unit;

    tempUnit.forEach((el) => (el.innerText = `°${unit.toUpperCase()}`));

    if (unit === "c") {
      celciusBtn.classList.add("active");
      fahrenheitBtn.classList.remove("active");
    } else {
      celciusBtn.classList.remove("active");
      fahrenheitBtn.classList.add("active");
    }

    getWeatherData(currentCity, currentUnit, hourlyorWeek);
  }
}

// hourly to weekly switch
hourlyBtn.addEventListener("click", () => changeTimeSpan("hourly"));
weekBtn.addEventListener("click", () => changeTimeSpan("week"));

function changeTimeSpan(unit) {
  if (hourlyorWeek !== unit) {
    hourlyorWeek = unit;
    if (unit === "hourly") {
      hourlyBtn.classList.add("active");
      weekBtn.classList.remove("active");
    } else {
      hourlyBtn.classList.remove("active");
      weekBtn.classList.add("active");
    }
    getWeatherData(currentCity, currentUnit, hourlyorWeek);
  }
}
