const getSlots(intentRequest){
  return intent_request['currentIntent']['slots'];
}

const elicitSlot(sessionAttributes, intentName, slots, elicitSlot, message){
  return {
    'sessionAttributes': session_attributes,
    'dialogAction': {
        'type': 'ElicitSlot',
        'intentName': intent_name,
        'slots': slots,
        'slotToElicit': slot_to_elicit,
        'message': message
    }
  };
}

const close(sessionAttributes, fullfillmentState, message) {
    const response = {
      'sessionAttributes': session_attributes,
      'dialogAction': {
          'type': 'Close',
          'fulfillmentState': fulfillment_state,
          'message': message
      }
  };
  return response;
}

const delegate(sessionAttributes, slots) {
    return {
      'sessionAttributes': session_attributes,
      'dialogAction': {
          'type': 'Delegate',
          'slots': slots
      }
  }
}


