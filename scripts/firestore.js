import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import * as Firestore from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const FirebaseConfig = {
    apiKey: "AIzaSyCi8x3Ht-r4OMUOnDjGfRynczfSXxlGuJ8",
    authDomain: "atpproject-bcda8.firebaseapp.com",
    projectId: "atpproject-bcda8",
    storageBucket: "atpproject-bcda8.firebasestorage.app",
    messagingSenderId: "63493936579",
    appId: "1:63493936579:web:5c382b0d5a190605515976"
};

const App = initializeApp(FirebaseConfig);
const Database = Firestore.getFirestore(App);

globalThis.GithubStorageConfig = {
    Token: "",
    StorageOwner: "kayyraa",
    StorageName: "DirectStorage"
};

globalThis.GithubStorage = class {
    constructor(Document) { this.File = Document || null; }

    async Upload(Path = "", OnUpload = (Success = new Boolean()) => {}) {
        if (!this.File) throw new Error("No file provided for upload.");
        const FileContent = await this.ReadFileAsBase64(this.File);

        const Url = `https://api.github.com/repos/${GithubStorageConfig.StorageOwner}/${GithubStorageConfig.StorageName}/contents/${Path}`;
        const Data = {
            message: "Upload file to repo",
            content: FileContent
        };

        const Response = await fetch(Url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${GithubStorageConfig.Token}`,
                "Accept": "application/vnd.github.v3+json"
            },
            body: JSON.stringify(Data)
        });
        OnUpload(Response.ok);
    }

    async Download(Path) {
        const Url = `https://api.github.com/repos/${GithubStorageConfig.StorageOwner}/${GithubStorageConfig.StorageName}/contents/${Path}`;

        const Response = await fetch(Url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${GithubStorageConfig.Token}`,
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (Response.ok) {
            const Result = await Response.json();
            const FileContent = atob(Result.content); // Decode Base64 content
            const Blob = new Blob([FileContent], { type: "application/octet-stream" });
            return new File([Blob], Path.split("/").pop(), { type: Blob.type });
        } else {
            const ErrorData = await Response.json();
            console.error("Failed to fetch file:", ErrorData);
            throw new Error(ErrorData.message || "File fetch failed");
        }
    }

    async ReadFileAsBase64(File) {
        return new Promise((Resolve, Reject) => {
            const Reader = new FileReader();
            Reader.onload = () => Resolve(Reader.result.split(",")[1]);
            Reader.onerror = Reject;
            Reader.readAsDataURL(File);
        });
    }
}

globalThis.FireStorage = class {
    constructor(Collection = "") {
        this.Collection = Collection;
    }

    async AppendDocument(DocumentData) {
        if (!this.Collection) return;
        const DocRef = await Firestore.addDoc(Firestore.collection(Database, this.Collection), DocumentData);
        return DocRef.id;
    }

    async GetDocument(DocumentId) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Database, this.Collection, DocumentId);
        const Snapshot = await Firestore.getDoc(DocRef);
        if (Snapshot.exists()) return { id: Snapshot.id, ...Snapshot.data() };
        return null;
    }

    async UpdateDocument(DocumentId, DocumentData) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Database, this.Collection, DocumentId);
        await Firestore.updateDoc(DocRef, DocumentData);
    }

    async DeleteDocument(DocumentId) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Database, this.Collection, DocumentId);
        await Firestore.deleteDoc(DocRef);
    }

    async GetDocuments(Query = {}) {
        if (!this.Collection) return;
        const CollectionRef = Firestore.collection(Database, this.Collection);
        let QueryRef = CollectionRef;
        Object.entries(Query).forEach(([Key, Value]) => {
            QueryRef = Firestore.query(QueryRef, Firestore.where(Key, "==", Value));
        });
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(Doc => ({ id: Doc.id, ...Doc.data() }));
    }

    async GetDocumentsByField(FieldName, FieldValue) {
        if (!this.Collection) return;
        const QueryRef = Firestore.query(
            Firestore.collection(Database, this.Collection),
            Firestore.where(FieldName, "==", FieldValue)
        );
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(Doc => ({ id: Doc.id, ...Doc.data() }));
    }

    async GetDocumentByFieldIncludes(FieldName, FieldValue) {
        if (!this.Collection) return;
        const QueryRef = Firestore.query(
            Firestore.collection(Database, this.Collection),
            Firestore.where(FieldName, ">=", FieldValue)
        );
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(Doc => ({ id: Doc.id, ...Doc.data() }));
    }

    OnSnapshot(Callback) {
        if (!this.Collection) return;
        const CollectionRef = Firestore.collection(Database, this.Collection);
        Firestore.onSnapshot(CollectionRef, Snapshot => {
            Callback(Snapshot);
        });
    }

    OnDocumentSnapshot(DocumentId, Callback) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Database, this.Collection, DocumentId);
        return Firestore.onSnapshot(DocRef, Snapshot => {
            if (!Snapshot.exists()) return;
            Callback({ id: Snapshot.id, ...Snapshot.data() });
        });
    }
};

globalThis.Frame = (Href = "") => {
    const Frame = document.querySelector(`.Frames > div[href="${Href}"]`);
    Frame.style.display = "";
    for (const OtherFrame of Array.from(document.querySelector(".Frames").children)) {
        if (OtherFrame === Frame) continue;
        OtherFrame.style.display = "none";
    }
}

globalThis.Uuid = (Length = 16) => {
    if ((Length & (Length - 1)) !== 0 || Length < 2) return "";

    return Array.from({ length: Length }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).reduce((Acc, Char, Index) =>
        Acc + (Index && Index % (Length / 2) === 0 ? "-" : "") + Char, ""
    );
};

queueMicrotask(async () => GithubStorageConfig.Token = await new FireStorage("Secrets").GetDocument("Token").then((Document) => Document.Value));