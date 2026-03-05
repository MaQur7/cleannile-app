"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

import { auth } from "../../lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

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

const joinEvent = async (event:any) => {

const user = auth.currentUser;

if(!user){
alert("Please login.");
return;
}

if(event.volunteers?.includes(user.uid)){
alert("You already joined this event.");
return;
}

await updateDoc(doc(db,"events",event.id),{
volunteers: arrayUnion(user.uid)
});

alert("You joined the cleanup event!");

};

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

<p>
Volunteers: {event.volunteers ? event.volunteers.length : 0}
</p>

<button
onClick={()=>joinEvent(event)}
style={{
marginTop:"10px",
padding:"8px 14px",
background:"#2c7be5",
color:"#fff",
border:"none",
borderRadius:"6px",
cursor:"pointer"
}}
>
Join Cleanup
</button>

</div>
))}

</div>

);

}
