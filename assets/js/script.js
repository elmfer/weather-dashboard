const OPEN_WEATHER_API_KEY = '08bab02cfe8ecd024eb7e69038dcec03';
const SEARCH_HISTORY_MAX_SIZE = 15;

var geolocation = {
  latitude: 0,
  longitude: 0,
  city: "City",
  state: "State"
};

var weather = {};

var header = {
  renderLocation: function(location) {
    $('#header-location').text(`${location.city}, ${location.state}`);
  },

  renderTemperature: function(temperature, scale) {
    $('#header-temperature').text(weatherManager.temperatureToString(temperature, scale));
  }
};

var searchHistory = {
  init: function() {
    const queries = this.get();

    this.renderData(queries);

    if(queries.length < 1) return;

    geolocation = queries[0].geolocation;
    citySearcher.renderLocation(geolocation);
    weather = queries[0].weather;
    weatherManager.renderData(weather);
  },
  add: function(query) {
    if(this.hasQuery(query)) {
      this.remove(query);
    }

    var queries = this.get();
    queries.unshift(query);

    if(queries.length > SEARCH_HISTORY_MAX_SIZE) queries.pop();

    this.save(queries);

    this.renderData(this.get());
  },
  remove: function(query) {
    var queries = this.get();

    for(var i = 0; i < queries.length; i++) {
      if(!citySearcher.isQueryEqual(query, queries[i])) continue;

      queries.splice(i, 1);
      break;
    }

    this.save(queries);
  },
  get: function() {
    const queries = localStorage.getItem('search-history');

    if(queries === null) return [];

    return JSON.parse(queries);
  },
  clear: function() {
    this.save([]);

    this.renderData(this.get());
  },
  hasQuery: function(query) {
    const queries = this.get();

    for(var i = 0; i < queries.length; i++){
      if(citySearcher.isQueryEqual(queries[i], query)) return true;
    }

    return false;
  },
  getQuery: function(key) {
    const queries = this.get();
    for(var i = 0; i < queries.length; i++){
      if(key === queries[i].key) return queries[i];
    }

    return null;
  },
  renderData: function(history) {
    var container = $('#search-history-list');
    container.children().remove();

    for(var i = 0; i < history.length; i++){
      const item = this.generateQueryItem(history[i]);

      container.append(item);
    }
  },
  generateQueryItem: function(query) {
    var item = $('<a>');
    item.text(`${query.geolocation.city}, ${query.geolocation.state}`);
    item.prop('href', "#");
    item.data('key', query.key);
    item.addClass('list-group-item');
    item.on('click', function(event){
      event.preventDefault();
      const item = $(event.target);
      const query = searchHistory.getQuery(item.data('key'));
      console.log(query.key);

      geolocation = query.geolocation;
      citySearcher.renderLocation(query.geolocation);
      weather = query.weather;
      weatherManager.renderData(query.weather);
    });

    return item;
  },
  save: function(queries) {
    localStorage.setItem('search-history', JSON.stringify(queries));
  }
}

var citySearcher = {
  init: function() {
    $('#search-city-btn').on('click', () => {
      citySearcher.search(citySearcher.getUserInput())
      .then(result => {
        geolocation = result.geolocation;
        citySearcher.renderLocation(result.geolocation);

        weather = result.weather;
        weatherManager.renderData(result.weather);

        searchHistory.add(result);
      });
    });
  },
  search: function(query) {
    if(query === '') {
      citySearcher.warnUser("Input must not be blank.");
      return;
    }

    citySearcher.removeWarning();
    citySearcher.setIsLoading(true);

    return citySearcher.fetchLocationByCityName(query)
    .then((newLocation) => {
      return weatherManager.fetchData(geolocation.latitude, geolocation.longitude)
      .then((weatherResponse) => {
        return { geolocation: newLocation, weather: weatherResponse, key: newLocation.key };
      });
    })
    .catch((error) => {
      citySearcher.warnUser(error);
    })
    .finally(() => {
      citySearcher.setIsLoading(false);
    });
  },
  warnUser: function(message) {
    $('#search-city-warn').removeClass('d-none').text(message);
  },
  removeWarning: function() {
    $('#search-city-warn').addClass('d-none');
  },
  getUserInput: function() {
    return $('#search-city').val();
  },
  setIsLoading: function(loading) {
    $('#search-city-btn').attr('disabled', loading);
    $('#search-city-btn').find('span').attr('hidden', !loading);
  },
  fetchLocationByCityName: function(name) {
    return fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${name}&limit=1&appid=${OPEN_WEATHER_API_KEY}`)
    .then((response) => {
      if(!response.ok) throw new Error("Cannot fetch location.");

      return response.json();
    })
    .then((json) => {
      return new Promise((resolve, reject) => {
        if(json.length === 0) reject("Cannot find that location by that name.");

        resolve({
          latitude: json[0].lat,
          longitude: json[0].lon,
          city: json[0].name,
          state: json[0].state,
          country: json[0].country,
          key: `${json[0].name},${json[0].state},${json[0].country}`
        });
      });
    });
  },
  fetchLocationByZipCode: function(zipcode) {

  },
  renderLocation: function(location) {
    header.renderLocation(location);
    dashboard.renderLocation(location);
  },
  isQueryEqual: function(query1, query2) {
    return query1.key === query2.key;
  }
};

var weatherManager = {
  fetchData: function(latitude, longitude) {
    const url =
    `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,hourly,alerts&appid=${OPEN_WEATHER_API_KEY}`;

    return fetch(url).then((response) => { return response.json() });
  },
  degreesToCompassRose: function(degrees) {
    const directions = [
      "N", "NE", "E", "SE", "S", "SW", "W", "NW"
    ];

    return directions[Math.round(degrees / 45) % 8];
  },
  temperatureToString: function(temperature, scale) {
    scale = scale.toUpperCase();

    if(scale === 'F') temperature = 1.8 * temperature - 459.67;

    temperature = Math.round(temperature);

    return `${temperature}°${scale}`;
  },
  windToString: function(windSpeed, unit, direction) {
    if(unit === 'mph') windSpeed *= 2.237;

    windSpeed = Math.round(windSpeed);

    return `${windSpeed} ${unit}, ${direction}`;
  },

  renderData: function(weatherData) {
    header.renderTemperature(weatherData.current.temp, 'F');
    dashboard.renderTemperature(weatherData.current.temp, 'F');

    const windDirection = this.degreesToCompassRose(weatherData.current.wind_deg);
    dashboard.renderWind(weatherData.current.wind_speed, 'mph', windDirection);

    dashboard.renderHumidity(weatherData.current.humidity);

    const backgroundImage = `assets/images/${backgroundMap[weatherData.current.weather[0].icon]}`;
    dashboard.renderBackgroundImage(backgroundImage);

    var forecast = [];
    for(var i = 0; i < 5; i++) {
      const dayForcast = weatherData.daily[i];
      var dayWeatherInfo = {};
      dayWeatherInfo.temperature = this.temperatureToString(dayForcast.temp.day, 'F');
      dayWeatherInfo.icon = iconMap[dayForcast.weather[0].icon];

      const windDirection = this.degreesToCompassRose(dayForcast.wind_deg);
      dayWeatherInfo.wind = "Wind: " + this.windToString(dayForcast.wind_speed, 'mph', windDirection);

      dayWeatherInfo.humidity = `Humidity: ${dayForcast.humidity}%`;
      dayWeatherInfo.precipitation = `Precipitaion: ${Math.round(dayForcast.pop * 100)}%`;

      forecast.push(dayWeatherInfo);
    }

    dashboard.render5DayForecast(forecast);
  }
}

var dashboard = {
  renderLocation: function(location) {
    $('#location').text(`${location.city}, ${location.state}`);
  },

  renderTemperature: function(temperature, scale) {
    $('#temperature').text(weatherManager.temperatureToString(temperature, scale));
  },

  renderWind: function(windSpeed, unit, direction) {
    $('#wind').text(weatherManager.windToString(windSpeed, unit, direction));
  },

  renderHumidity: function(humidity) {
    $('#humidity').text(`${Math.round(humidity)}%`);
  },
  renderBackgroundImage: function(background) {
    $('main').css('background-image',
    `linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)), url(\"${background}\")`);
  },
  render5DayForecast: function(forecast) {
    var container = $('#5-day-forecast');
    container.children().remove();

    for(var i = 0; i < 5; i++) {
      const card = this.generateDayForcastCard(i, forecast[i]);

      container.append(card);
    }
  },
  generateDayForcastCard: function(daysInAdvance, forecast) {
    var card = $('<div>');
    card.addClass('card frosted-glass text-white box-shadow w-20 mr-3');
    card.css('min-width', '160px');

    var cardHeader = $('<div>');
    cardHeader.addClass('card-header bg-transparent');
    cardHeader.text(dayjs().add(daysInAdvance, 'day').format('dddd'));
    card.append(cardHeader);

    var cardBody = $('<div>');
    cardBody.addClass('card-body bg-transparent');

    var cardTitle = $('<div>').addClass('d-flex justify-content-between align-items-center')
    cardTitle.append($('<h5>').text(forecast.temperature));
    cardTitle.append($('<span>').addClass('wi ' + forecast.icon).css('font-size', '2rem'));
    cardBody.append(cardTitle);

    cardBody.append($('<div>').text(forecast.wind).css('margin', '3px'));
    cardBody.append($('<div>').text(forecast.humidity).css('margin', '3px'));
    cardBody.append($('<div>').text(forecast.precipitation).css('margin', '3px'));
    card.append(cardBody);

    return card;
  }
};

function init() {
  searchHistory.init();
  citySearcher.init();
}

init();