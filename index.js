'use strict';

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

  if (
    !flowerType &&
    !flowerTypes.includes(flowerType ? flowerType.toLowerCase() : '')
  ) {
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
        'I did not understand that, what date works best for you?'
      );
    }
    if (parseLocalDate(date) <= new Date()) {
      return buildValidationResult(
        false,
        'PickupDate',
        'Flower pickup must be scheduled a day in advance.  Can you try a different date?'
      );
    }
  }

  if (pickupTime) {
    if (pickupTime.length !== 5) {
      return buildValidationResult(
        false,
        'PickupTime',
        'I did not recognize that, what time would you like to pickup flower?'
      );
    }
    const hour = parseInt(pickupTime.substring(0, 2), 10);
    const minute = parseInt(pickupTime.substring(3), 10);
    if (isNaN(hour) || isNaN(minute)) {
      return buildValidationResult(
        false,
        'PickupTime',
        'I did not recognize that, what time would you like to pickup flowers?'
      );
    }
    if (hour < 10 || hour > 16) {
      // Outside of business hours
      return buildValidationResult(
        false,
        'PickupTime',
        'Our business hours are ten a.m. to five p.m.  What time works best for you?'
      );
    }
  }
  return buildValidationResult(true, null, null);
}

function orderFlowers(intentRequest) {
  /// --->
  /// Performs dialog management and fulfillment for ordering flowers.
  /// Beyond fulfillment, the implementation of this intent demonstrates the use of the elicitSlot dialog action
  /// in slot validation and re-prompting.
  ///<--
  const flowerType = intentRequest.currentIntent.slots.FlowerType;
  const date = intentRequest.currentIntent.slots.PickupDate;
  const pickupTime = intentRequest.currentIntent.slots.PickupTime;
  const source = intentRequest.invocationSource;
  const outputSessionAttributes = intentRequest.sessionAttributes || {};

  if (source == 'DialogCodeHook') {
    const slots = intentRequest.currentIntent.slots;
    const validationResult = validateOrders(flowerType, date, pickupTime);
    if (!validationResult.isValid) {
      slots[`${validationResult.validatedSlot}`] = null;
      return elicitSlot(
        outputSessionAttributes,
        intentRequest.currentIntent.name,
        slots,
        validationResult.violatedSlot,
        validationResult.message
      );
    }

    const outputSessionAttributes = outputSessionAttributes
      ? outputSessionAttributes
      : null;

    if (flowerType) {
      outputSessionAttributes['Price'] = flowerType.length() * 5;
    }
    return delegate(outputSessionAttributes, intentRequest.currentIntent.slots);
  }
  return close(outputSessionAttributes, 'Fulfilled', {
    contentType: 'PlainText',
    content: `Thanks, your order for ${flowerType} has been placed and will be ready for pickup by ${pickupTime} on ${date}`,
  });
}

function dispatch(intentRequest, callback) {
  console.log(JSON.stringify(intentRequest, null, 2));
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
    process.env.TZ = 'America/Denver';
    dispatch(event, (response) => loggingCallback(response, callback));
  } catch (err) {
    callback(err);
  }
};
