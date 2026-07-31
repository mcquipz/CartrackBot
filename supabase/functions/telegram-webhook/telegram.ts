const TOKEN =
  Deno.env.get("TELEGRAM_BOT_TOKEN")!;


const DEFAULT_CHAT_ID =
  Deno.env.get("TELEGRAM_CHAT_ID")!;


const TELEGRAM_API =
  `https://api.telegram.org/bot${TOKEN}`;



export async function sendTelegramMessage(
  chatId: number | string,
  message: string,
  options:any = {},
) {

  const response = await fetch(
    `${TELEGRAM_API}/sendMessage`,
    {
      method:"POST",

      headers:{
        "Content-Type":"application/json",
      },

      body:JSON.stringify({

        chat_id:chatId,

        text:message,

        parse_mode:"Markdown",

        disable_web_page_preview:true,

        ...options,

      }),
    },
  );


  if(!response.ok){

    throw new Error(
      await response.text()
    );

  }


  return await response.json();

}





export async function sendLocation(
  latitude:number,
  longitude:number,
  chatId?:number|string,
){

  const targetChat =
    chatId ?? DEFAULT_CHAT_ID;


  const response =
    await fetch(
      `${TELEGRAM_API}/sendLocation`,
      {
        method:"POST",

        headers:{
          "Content-Type":"application/json",
        },

        body:JSON.stringify({

          chat_id:targetChat,

          latitude,

          longitude,

        }),
      },
    );


  if(!response.ok){

    throw new Error(
      await response.text()
    );

  }


  return await response.json();

}





// MAIN MENU
export async function sendMenu(
  chatId: number | string,
) {

  return await sendTelegramMessage(
    chatId,

`🚗 *Mekas Fleet Tracker*

Select an option:`,

    {
      reply_markup: {
        keyboard: [
 [
  {
    text:"🚗 Status"
  },
  {
    text:"📍 Location"
  }
 ],

 [
  {
    text:"📋 Trips"
  },
  {
    text:"📌 Events"
  }
 ],

 [
  {
    text:"👤 Assign Driver"
  }
 ],

 [
  {
    text:"⚙ Help"
  }
 ],
],

        resize_keyboard: true,

      },
    },
  );

}




// VEHICLE SELECTION MENU
export function vehicleMenu(
  command: string,
  vehicles: any[],
) {

  return {

    keyboard: [

      ...vehicles.map(
        (vehicle) => [
          {
            text:
              `${command} ${vehicle.registration}`,
          },
        ],
      ),

      [
        {
          text:
            `${command} ALL`,
        },
      ],

      // BACK TO MAIN MENU
      [
        {
          text:
            "⬅️ Back to Main Menu",
        },
      ],

    ],

    resize_keyboard: true,

  };

}
// DRIVER SELECTION MENU
export function driverMenu() {

  return {

    keyboard: [

      [
        {
          text: "👤 Reynaldo Andalay",
        },
      ],

      [
        {
          text: "👤 Romie Pitos",
        },
      ],

      [
        {
          text: "👤 Juanito Rodrigo",
        },
      ],

      [
        {
          text: "⬅️ Back to Main Menu",
        },
      ],

    ],

    resize_keyboard: true,

  };

}


// DRIVER VEHICLE SELECTION MENU
export function driverVehicleMenu(
  vehicles: any[],
) {

  return {

    keyboard: [

      ...vehicles.map(
        (vehicle) => [
          {
            text:
              `🚘 ${vehicle.registration}`,
          },
        ],
      ),

      [
        {
          text:
            "⬅️ Back to Main Menu",
        },
      ],

    ],

    resize_keyboard: true,

  };

}