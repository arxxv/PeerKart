import supertest from "supertest";
const request = supertest("http://localhost:3000/api/v1/");
import { expect } from "chai";

let newUser = {
  email: "x2spxoscef@gmail.com",
  password: "password",
  confirmPassword: "password",
  username: "x2spxoscef",
};

let newOrder = {
  name: "new test order",
  items: [
    { name: "item1", quantity: 1, unit: "kg" },
    { name: "item2", quantity: 1, unit: "dozen" },
  ],
  category: "Grocery",
  address: {
    address: "Boys hostel, IIIT Guwahati, Bongora, Guwahati, Assam",
  },
  paymentMethod: {
    paymentType: "UPI",
    paymentId: "Icici@4321",
  },
  contact: "9834136328",
};

let newOrder2 = {
  name: "new test order",
  items: [
    { name: "item1", quantity: 1, unit: "kg" },
    { name: "item2", quantity: 1, unit: "dozen" },
  ],
  category: "Grocery",
  address: {
    address: "Boys hostel, IIIT Guwahati, Bongora, Guwahati, Assam",
  },
  paymentMethod: {
    paymentType: "UPI",
    paymentId: "Icici@4321",
  },
  contact: "9834136328",
};

let userUpdate = {
  address: { address: "'Saubhagya' H.No.286G, Sateribhat, Divar, Goa" },
  paymentMethod: {
    paymentType: "UPI",
    paymentId: "Icici@4321",
  },
  contact: "3764",
};

let newAcceptedOrder = {};

const randomString = () => {
  return (Math.random() + 1).toString(36).substring(2, 15);
};

describe("Auth", () => {
  it("POST /signup with existing email/username", () => {
    return request
      .post("auth/signup")
      .send(newUser)
      .then((res) => {
        expect(res.body).to.deep.include({
          error: {
            value: newUser.email,
            msg: "Email already in use. Please pick a different one or login instead.",
            param: "email",
            location: "body",
          },
        });
      });
  });

  it("POST /signup", () => {
    const newUsername = randomString();
    newUser.email = newUsername + "@gmail.com";
    newUser.username = newUsername;
    return request
      .post("auth/signup")
      .send(newUser)
      .then((res) => {
        expect(res.body.data).to.be.eq("success");
      });
  });

  it("POST /login with invalid creds", () => {
    return request
      .post("auth/login")
      .send({
        email: newUser.email,
        password: "wrongpassword",
      })
      .then((res) => {
        expect(res.body).to.deep.include({
          error: { msg: "Invalid username or password" },
        });
      });
  });

  it("POST /login", () => {
    return request
      .post("auth/login")
      .send({
        email: newUser.email,
        password: newUser.password,
      })
      .then((res) => {
        expect(res.body).to.have.own.property("token");
        expect(res.body).to.have.own.property("id");
        newUser.token = res.body.token;
        newUser.id = res.body.id;
      });
  });
});

describe("Orders & Users", () => {
  it("GET /users/details", () => {
    return request
      .get("users/details")
      .set({ Authorization: `Bearer ${newUser.token}` })
      .then((res) => {
        expect(res.body.data).to.have.own.property("id");
        expect(res.body.data).to.have.own.property("username");
        expect(res.body.data).to.have.own.property("email");
        expect(res.body.data).to.have.own.property("contact");
        expect(res.body.data).to.have.own.property("points");
        expect(res.body.data).to.have.own.property("paymentMethod");
        expect(res.body.data).to.have.own.property("address");
        res.body.data.token = newUser.token;
        newUser = res.body.data;
      });
  });

  it("PUT /users/update", () => {
    return request
      .put("users/update")
      .set({ Authorization: `Bearer ${newUser.token}` })
      .send(userUpdate)
      .then((res) => {
        expect(res.body.data.address).to.have.lengthOf(1);
        expect(res.body.data.paymentMethod).to.have.lengthOf(1);
        expect(res.body.data.contact).to.have.lengthOf(1);
        res.body.data.token = newUser.token;
        newUser = res.body.data;
      });
  });

  it("GET /orders", () => {
    return request.get("orders").then((res) => {
      expect(res.body.data).have.lengthOf(res.body.noOfOrders);
    });
  });

  it("POST /orders", () => {
    return request
      .post("orders")
      .set({ Authorization: `Bearer ${newUser.token}` })
      .send(newOrder)
      .then((res) => {
        expect(res.body.data.generatedBy).to.be.eq(newUser.id);
        expect(res.body.data.state).to.be.eq("active");
        expect(res.body.data.acceptedBy).to.be.null;
        newOrder = res.body.data;
      });
  });

  it("DELETE /orders/:id", () => {
    return request
      .delete(`orders/${newOrder._id}`)
      .set({ Authorization: `Bearer ${newUser.token}` })
      .then((res) => {
        expect(res.body.data).to.deep.include(newOrder);
      });
  });

  it("POST /orders once again", () => {
    return request
      .post("orders")
      .set({ Authorization: `Bearer ${newUser.token}` })
      .send(newOrder)
      .then((res) => {
        expect(res.body.data.generatedBy).to.be.eq(newUser.id);
        expect(res.body.data.state).to.be.eq("active");
        expect(res.body.data.acceptedBy).to.be.null;
        newOrder = res.body.data;
      });
  });

  it("GET /users/orders/created", () => {
    return request
      .get("users/orders/created")
      .set({ Authorization: `Bearer ${newUser.token}` })
      .then((res) => {
        expect(res.body.data).to.have.lengthOf(1);
        expect(res.body.data).to.deep.include(newOrder);
      });
  });

  it("GET /orders/:id", () => {
    return request
      .get(`orders/${newOrder._id}`)
      .set({ Authorization: `Bearer ${newUser.token}` })
      .send(newOrder)
      .then((res) => {
        expect(res.body.data).to.deep.include(newOrder);
      });
  });

  it("POST /orders invalid category", () => {
    const newOrderCopy = { ...newOrder };
    newOrderCopy.category = "fish";
    return request
      .post("orders")
      .set({ Authorization: `Bearer ${newUser.token}` })
      .send(newOrderCopy)
      .then((res) => {
        expect(res.body).to.deep.include({
          error: {
            value: "fish",
            msg: "Invalid category",
            param: "category",
            location: "body",
          },
        });
      });
  });

  it("PUT /orders/:id", () => {
    const newOrderCopy = { ...newOrder };
    newOrderCopy.name = "new updated name";
    return request
      .put(`orders/${newOrder._id}`)
      .set({ Authorization: `Bearer ${newUser.token}` })
      .send(newOrderCopy)
      .then((res) => {
        expect(res.body.data.name).to.be.eq("new updated name");
        newOrder = res.body.data;
      });
  });

  it("PUT /orders/:id/accept myorder myself", () => {
    return request
      .put(`orders/${newOrder._id}/accept`)
      .set({ Authorization: `Bearer ${newUser.token}` })
      .then((res) => {
        expect(res.body).to.deep.include({
          error: {
            msg: "You cannot accept this order",
          },
        });
      });
  });

  it("PUT /orders/:id/accept some other order", () => {
    return request
      .put(`orders/625948b8b6e864dc1f89c620/accept`)
      .set({ Authorization: `Bearer ${newUser.token}` })
      .then((res) => {
        expect(res.body.data.state).to.be.eq("accepted");
        expect(res.body.data.acceptedBy).to.be.eq(newUser.id);
        newAcceptedOrder = res.body.data;
      });
  });

  it("PUT /orders/:id/reject the same order", () => {
    return request
      .put(`orders/625948b8b6e864dc1f89c620/reject`)
      .set({ Authorization: `Bearer ${newUser.token}` })
      .then((res) => {
        expect(res.body.data.state).to.be.eq("active");
        expect(res.body.data.acceptedBy).to.be.null;
      });
  });

  it("POST /orders Create a new order with a different user", () => {
    const newOrderCopy = { ...newOrder };
    return request
      .post("orders")
      .set({
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyNTkyY2Y3NTg2NTA3NjljYmU1NDFhZiIsInJvbGUiOjAsImlhdCI6MTY1MDAxNTE2NX0.yQxerV8CtZuzZ5_1IDjW3_9x9rCB8Xpsr62gDG-k-4A`,
      })
      .send(newOrderCopy)
      .then((res) => {
        expect(res.body.data.state).to.be.eq("active");
        expect(res.body.data.acceptedBy).to.be.null;
        newOrder2 = res.body.data;
      });
  });

  it("PUT /orders/:id/accept the new order", () => {
    return request
      .put(`orders/${newOrder2._id}/accept`)
      .set({ Authorization: `Bearer ${newUser.token}` })
      .then((res) => {
        expect(res.body.data.state).to.be.eq("accepted");
        expect(res.body.data.acceptedBy).to.be.eq(newUser.id);
        newAcceptedOrder = res.body.data;
      });
  });

  it("PUT /orders/:id/complete", () => {
    return request
      .put(`orders/${newOrder2._id}/complete`)
      .set({
        Authorization: `Bearer ${newUser.token}`,
      })
      .then((res) => {
        expect(res.body.data.state).to.be.eq("complete");
      });
  });
});
