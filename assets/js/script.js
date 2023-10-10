const OPEN_WEATHER_API_KEY = '08bab02cfe8ecd024eb7e69038dcec03';

var geolocation = {
  latitude: 0,
  longitude: 0,
  city: "City",
  state: "State"
};

var header = {
  renderLocation: function(location) {
    $('#header-location').text(`${location.city}, ${location.state}`);
  },

  renderTemperature: function(temperature, scale) {
    if(scale === 'F') temperature = 1.8 * temperature - 459.67;

    temperature = Math.floor(temperature);

    $('#header-temperature').text(`${temperature}°${scale}`)
  }
};

var citySearcher = {
  init: function() {
    $('#search-city-btn').on('click', function() {
      var input = citySearcher.getUserInput();

      if(input === '') {
        citySearcher.warnUser("Input must not be blank.");
        return;
      }

      citySearcher.removeWarning();
      citySearcher.setIsLoading(true);

      citySearcher.fetchLocationByCityName(input)
      .then((newLocation) => {
        geolocation = newLocation;
        header.renderLocation(geolocation);
        dashboard.renderLocation(geolocation);
      })
      .catch((error) => {
        citySearcher.warnUser(error);
      })
      .finally(() => {
        citySearcher.setIsLoading(false);
      });
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
          state: json[0].state
        });
      });
    });
  },
  fetchLocationByZipCode: function(zipcode) {

  }
};

var dashboard = {
  renderLocation: function(location) {
    $('#location').text(`${location.city}, ${location.state}`);
  },

  renderTemperature: function(temperature, scale) {
    if(scale === 'F') temperature = 1.8 * temperature - 459.67;

    temperature = Math.floor(temperature);

    $('#temperature').text(`${temperature}°${scale}`);
  },

  renderWeatherData: function(weather) {
    $('#wind').text(weather.wind);
    $('#humidity').text(weather.humidity);
  },

  render5DayForecast: function(forecast) {
    var container = $('#5-day-forecast');

    for(var i = 0; i < 5; i++) {
      var card = $('<div>');
      card.addClass('card frosted-glass text-white box-shadow w-20 mr-3');
      card.css('min-width', '160px');

      var cardHeader = $('<div>');
      cardHeader.addClass('card-header bg-transparent');
      cardHeader.text(dayjs().add(i, 'day').format('dddd'));
      card.append(cardHeader);

      var cardBody = $('<div>');
      cardBody.addClass('card-body bg-transparent');
      cardBody.append($('<h5>').text(forecast[i]));
      cardBody.append($('<p>').text(forecast[i]));
      cardBody.append($('<p>').text(forecast[i]));
      card.append(cardBody);

      container.append(card);
    }
  }
};

function init() {
  header.renderLocation(geolocation);
  header.renderTemperature(285, 'F');

  dashboard.renderLocation(geolocation);
  dashboard.renderTemperature(285, 'F');

  dashboard.render5DayForecast({});

  citySearcher.init();
}

init();