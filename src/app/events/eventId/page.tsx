"use client";

import { useEffect,useState } from "react";
import { db,auth } from "../../../lib/firebase";
import { doc,getDoc,updateDoc,arrayUnion } from "firebase/firestore";
import { useParams } from "next/navigation";

export default function EventPage(){

const params = useParams();

const [event,setEvent] = useState<any>(null);

useEffect(()=>{

const loadEvent = async()=>{

const ref = doc(db,"events",params.id as string);

const snapshot = await getDoc(ref);

if(snapshot.exists()){

setEvent(snapshot.data());

}

};

loadEvent();

},[]);

const signup = async()=>{

if(!auth.currentUser){

alert("Login required");

return;

}

const ref = doc(db,"events",params.id as string);

await updateDoc(ref,{

attendees:arrayUnion(auth.currentUser.uid)

});

alert("You joined the cleanup!");

};

if(!event) return <p>Loading...</p>;

return(

<div style={{maxWidth:"700px",margin:"auto",padding:"40px"}}>

<h1>{event.title}</h1>

<p>{event.description}</p>

<p>Date: {event.date}</p>

<p>Volunteers: {event.attendees?.length || 0}</p>

<button onClick={signup}>
Join Cleanup
</button>

</div>

);

}