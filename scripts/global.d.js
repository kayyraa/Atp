const ProductDisplay = document.querySelector(".ProductDisplay");

document.querySelectorAll(".Topbar > .Button").forEach(Button => {
    ["click", "touchstart"].forEach(Event => {
        Button.addEventListener(Event, () => {
            Frame(Button.getAttribute("href") || "Products");
            Button.setAttribute("Active", "");
            document.querySelectorAll(".Topbar > .Button").forEach(OtherButton => {
                if (OtherButton === Button) return;
                OtherButton.removeAttribute("Active");
            });
        });
    });
});

function FormatPrice(Price) {
    return Price.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

const Products = new FireStorage("Products");
await Products.GetDocuments().then((Documents) => {
    Documents.forEach(Document => {
        const Product = document.createElement("div");
        Product.innerHTML = `
            <img class="Thumbnail" src="https://github.com/kayyraa/DirectStorage/blob/main/atp/hq720.jpg?raw=true">
            <div>
                <span class="Name">${Document.Name}</span>
                <span class="Description">${Document.Description}</span>
                <div class="Align">
                    <span class="Seller">${Document.Seller}</span>
                    <div class="Rating">${Document.Rating.toFixed(1)}<img src="images/Star.svg"></div>
                    <div class="Price">${FormatPrice(Document.Price)}</div>
                </div>
            </div>
        `.replaceAll("\n", "");
        document.querySelector(`.Frames > div[href="Products"] > .Items`).appendChild(Product);

        Product.addEventListener("click", () => {
            ProductDisplay.style.display = "";
            ProductDisplay.querySelector(".Images").innerHTML = Document.Images.map(Image => `<img src="${Image}">`).join("");
            ProductDisplay.querySelector(".Text > .Name").innerHTML = Document.Name;
            ProductDisplay.querySelector(".Text > .Description").innerHTML = Document.Description;
            ProductDisplay.querySelector(".Text > .Align > .Seller").innerHTML = Document.Seller;
            ProductDisplay.querySelector(".Text > .Align > .Rating").innerHTML = `${Document.Rating.toFixed(1)}<img src="images/Star.svg">`;
            ProductDisplay.querySelector(".Text > .Align > .Price").innerHTML = FormatPrice(Document.Price);
        });
    });
});

document.querySelector(".ProductDisplay > .Button.Back").addEventListener("click", () => {
    ProductDisplay.style.display = "none";
});