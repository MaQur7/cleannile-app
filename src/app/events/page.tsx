"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function EventsPage() {

const [events,setEvents] = useState<any[]>([]);

useEffect(()=>{

const loadEvents = async()=>{

const snapshot = await getDocs(collection(db,"events"));

const data = snapshot.docs.map(doc=>({
id:doc.id,
...doc.data()
}));

setEvents(data);

};

loadEvents();

},[]);

return(

<div style={{padding:"40px",maxWidth:"900px",margin:"auto"}}>

<h1>Community Cleanup Events</h1>

{events.length === 0 && <p>No events yet.</p>}

{events.map((event)=>(

<div key={event.id}
style={{
border:"1px solid #ddd",
padding:"15px",
borderRadius:"8px",
marginBottom:"15px"
}}>

<h3>{event.title}</h3>
<p>{event.description}</p>
<p>{event.date}</p>

</div>
))}

</div>

);

}
