'use strict';

function getSlots(intentRequest) {
  return intentRequest['currentIntent']['slots'];
}

function elicitSlot(
  sessionAttributes,
  intentName,
  slots,
  slotToElicit,
  message
) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'ElicitSlot',
      intentName,
      slots,
      slotToElicit,
      message,
    },
  };
}

function confirmIntent(sessionAttributes, intentName, slots, message) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'ConfirmIntent',
      intentName,
      slots,
      message,
    },
  };
}

function close(sessionAttributes, fulfillmentState, message) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'Close',
      fulfillmentState,
      message,
      responseCard,
    },
  };
}

function delegate(sessionAttributes, slots) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'Delegate',
      slots,
    },
  };
}

// Build a validation result

function buildValidationResult(isValid, violatedSlot, messageContent) {
  if (!messageContent) {
    return {
      isValid: isValid,
      violatedSlot: violatedSlot,
    };
  }
  return {
    isValid: isValid,
    violatedSlot: violatedSlot,
    message: { contentType: 'PlainText', content: messageContent },
  };
}

// ---------------- Helper Functions --------------------------------------------------

function parseLocalDate(date) {
  /**
   * Construct a date object in the local timezone by parsing the input date string, assuming a YYYY-MM-DD format.
   * Note that the Date(dateString) constructor is explicitly avoided as it may implicitly assume a UTC timezone.
   */
  const dateComponents = date.split(/\-/);
  return new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2]);
}

function isValidDate(date) {
  try {
    return !isNaN(parseLocalDate(date).getTime());
  } catch (err) {
    return false;
  }
}

function incrementTimeByThirtyMins(time) {
  if (time.length !== 5) {
    // Not a valid time
  }
  const hour = parseInt(time.substring(0, 2), 10);
  const minute = parseInt(time.substring(3), 10);
  return minute === 30 ? `${hour + 1}:00` : `${hour}:30`;
}

// Returns a random integer between min (included) and max (excluded)
function getRandomInt(min, max) {
  const minInt = Math.ceil(min);
  const maxInt = Math.floor(max);
  return Math.floor(Math.random() * (maxInt - minInt)) + minInt;
}

/**
 * Called when the user specifies an intent for this skill.
 */
function validateOrders(flowerType, date, pickupTime) {
  const flowerTypes = ['lilies', 'roses', 'tulips'];
  if (!flowerType && !flowerTypes.includes(flowerType.toLowerCase())) {
    return buildValidationResult(
      false,
      'FlowerType',
      `We do not have ${flowerType}, would you like a different type of flower? if you want to try roses instead?`
    );
  }

  if (date) {
    if (!isValidDate(date)) {
      return buildValidationResult(
        false,
        'PickupDate',
        `You entered invalid date. What date would you like to pick up ${flower_type}`
      );
    } else if (date <= new Date()) {
      return buildValidationResult(
        false,
        'PickupDate',
        `You can pick up the flowers from tomorrow onwards.  What day would you like to pick them up?`
      );
    }
  }

  if (pickupTime) {
    if (pickupTime.length != 5) {
      return buildValidationResult(false, 'PickupTime', None);
    }
    const [hour, min] = pickupTime.split(':');
    const hour = parseInt(hour);
    const min = parseInt(min);

    if (isNaN(hour) || isNaN(min)) {
      return buildValidationResult(false, 'PickupTime', None);
    }

    if (hour < 10 || hour > 16) {
      return buildValidationResult(
        false,
        'PickupTime',
        'Our business hours are from ten a m. to five p m. Can you specify a time during this range?'
      );
    }
  }
  return buildValidationResult(true, None, None);
}

function orderFlowers(intentRequest, callback) {
  /// --->
  /// Performs dialog management and fulfillment for ordering flowers.
  /// Beyond fulfillment, the implementation of this intent demonstrates the use of the elicitSlot dialog action
  /// in slot validation and re-prompting.
  ///<--
  const flowerType = getSlots(intentRequest)['FlowerType'];
  const date = getSlots(intentRequest)['PickupDate'];
  const pickupTime = getSlots(intentRequest)['PickupTime'];
  const source = intentRequest['invocationSource'];

  if (source == 'DialogCodeHook') {
    const slots = getSlots(intentRequest);
    const validationResult = validateOrders(flowerType, date, pickupTime);
    if (!validationResult['isValid']) {
      slots[validationResult['validatedSlot']] = null;
      return elicitSlot(
        intent_request['sessionAttributes'],
        intent_request['currentIntent']['name'],
        slots,
        validation_result['violatedSlot'],
        validation_result['message']
      );
    }
    const outputSessionAttributes = intentRequest['sessionAttributes']
      ? intentRequest['sessionAttributes']
      : null;
    if (!flowerType) {
      outputSessionAttributes['Price'] = flowerType.length() * 5;
    }
    return delegate(outputSessionAttributes, getSlots(intentRequest));
  }
  return close(intentRequest['sessionAttributes'], 'Fulfilled', {
    contentType: 'PlainText',
    content: `Thanks, your order for ${flowerType} has been placed and will be ready for pickup by ${pickupTime} on ${date}`,
  });
}

function dispatch(intentRequest, callback) {
  // console.log(JSON.stringify(intentRequest, null, 2));
  console.log(
    `dispatch userId=${intentRequest.userId}, intent=${intentRequest.currentIntent.name}`
  );

  const name = intentRequest.currentIntent.name;

  // Dispatch to your skill's intent handlers
  if (name === 'OrderFlowers') {
    return orderFlowers(intentRequest, callback);
  }
  throw new Error(`Intent with name ${name} not supported`);
}

function loggingCallback(response, originalCallback) {
  // console.log(JSON.stringify(response, null, 2));
  originalCallback(null, response);
}

exports.handler = (event, context, callback) => {
  try {
    // By default, treat the user request as coming from the America/New_York time zone.
    process.env.TZ = 'America/New_York';
    console.log(`event.bot.name=${event.bot.name}`);

    /**
     * Uncomment this if statement and populate with your Lex bot name and / or version as
     * a sanity check to prevent invoking this Lambda function from an undesired Lex bot or
     * bot version.
     */
    /*
      if (event.bot.name !== 'MakeAppointment') {
           callback('Invalid Bot Name');
      }
      */
    dispatch(event, (response) => loggingCallback(response, callback));
  } catch (err) {
    callback(err);
  }
};
