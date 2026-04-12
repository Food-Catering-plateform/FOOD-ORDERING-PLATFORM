import React, { useState } from "react";
import create from "../../Assets/create.png";
import updateLogo from "../../Assets/updateLogo.png";
import "./VendorPage.css";

function VendorPage() {
  const handleCreateMenu = () => {
    alert("CREATE A NEW MENU PAGE");
  };

  const handleUpdateMenu = () => {
    alert("UPDATE A MENU");
  };

  return (

    <div className="layout">

      {/* MAIN CONTENT */}
      <main className="content">

        <section aria-label="vendor menu options" className="menu-cards">

          <button onClick={handleCreateMenu}>
            <figure>
              <img src={create} alt="Create a new menu" width="150" />
              <figcaption>Create A New Menu</figcaption>
            </figure>
          </button>

          <button onClick={handleUpdateMenu}>
            <figure>
              <img src={updateLogo} alt="Update existing menu" width="150" />
              <figcaption>Update Existing Menu</figcaption>
            </figure>
          </button>

        </section>

      </main>

    </div>

  );
}

export default VendorPage;