import React from "react";
import create from "../../Assets/create.png"
import updateLogo from "../../Assets/updateLogo.png"

function MenuTasks(){

     const handleCreateMenu = () => {
        alert("CREATE A NEW MENU PAGE");
     };
     const handleUpdateMenu = () => {
        alert ("UPDATE A MENU");
     };
     
     return(

        <main> 
            <section aria-label = "vendor menu options">
            <button onClick = {handleCreateMenu}>
                <figure>
                    <img
                        src = {create}
                        alt = "CREATE A NEW MENU"
                        width = "150"
                    />
                    <figcaption> Create a new menu</figcaption>
                </figure>
            </button>    

            <button onClick = {handleUpdateMenu}>
                <figure>

                    <img
                        src = {updateLogo}
                        alt = "Update the existing menu"
                        width = "150"
                     /> 
                <figcaption>Update Menu</figcaption>       

                </figure>
                
                </button> 
            </section>
        </main>
     );
}

export default MenuTasks;