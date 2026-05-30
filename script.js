(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      const isOpen = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("nav-open", isOpen);
    });

    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      });
    });
  }

  const currentFile = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach(function (link) {
    const href = link.getAttribute("href");
    const linkFile = href.split("#")[0];
    if (linkFile === currentFile && !href.includes("#")) {
      link.setAttribute("aria-current", "page");
    }
  });

  document.querySelectorAll("[data-year]").forEach(function (node) {
    node.textContent = new Date().getFullYear();
  });

  const cards = document.querySelectorAll(".project-card, .work-card, .pill-card, .workflow-card");
  cards.forEach(function (card) {
    card.addEventListener("pointermove", function (event) {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--spot-x", x + "%");
      card.style.setProperty("--spot-y", y + "%");
    });
  });

  const demoForm = document.querySelector("[data-vin-demo-form]");
  if (!demoForm) {
    return;
  }

  const demoStage = document.querySelector("[data-demo-stage]");
  const sampleButton = document.querySelector("[data-demo-sample]");
  const resetButton = document.querySelector("[data-demo-reset]");
  const dataList = document.querySelector("[data-vehicle-data]");
  const vehicleDataCard = document.querySelector(".vehicle-data-card");
  const descriptionOutput = document.querySelector("[data-description-output]");
  const workflowProgress = document.querySelector(".workflow-progress");
  const progressDots = document.querySelectorAll("[data-progress-step]");
  const stepOrder = ["decode", "structure", "brand", "description"];
  const stepNodes = {
    decode: document.querySelector('[data-step="decode"]'),
    structure: document.querySelector('[data-step="structure"]'),
    brand: document.querySelector('[data-step="brand"]'),
    description: document.querySelector('[data-step="description"]')
  };

  const sampleVehicle = {
    vin: "1HGCV1F34JA000001",
    year: "2018",
    make: "Honda",
    model: "Accord",
    trim: "Sport",
    body: "Sedan/Saloon",
    engine: "1.5L",
    drive: "FWD",
    fuel: "Gasoline",
    cab: "",
    dealer: "ABC Dealership",
    tones: ["clear"],
    proof: "an award-winning customer experience, transparent negotiation-free pricing, a certified inspection by manufacturer-trained technicians, online or in-store purchase support, fast digital paperwork, dedicated delivery coordination"
  };

  const stepWorkingMs = 2500;
  const stepCompleteMs = 2200;

  function setActiveStep(activeName) {
    const activeIndex = stepOrder.indexOf(activeName);
    const safeIndex = activeIndex >= 0 ? activeIndex : 0;

    stepOrder.forEach(function (name, index) {
      const step = stepNodes[name];
      if (!step) {
        return;
      }
      step.classList.remove("is-active", "is-prev", "is-next", "is-far");
      if (index === safeIndex) {
        step.classList.add("is-active");
      } else if (index === safeIndex - 1) {
        step.classList.add("is-prev");
      } else if (index === safeIndex + 1) {
        step.classList.add("is-next");
      } else {
        step.classList.add("is-far");
      }
    });

    if (workflowProgress) {
      const progressPercent = stepOrder.length > 1 ? (safeIndex / (stepOrder.length - 1)) * 75 : 0;
      workflowProgress.style.setProperty("--progress", progressPercent + "%");
    }

    progressDots.forEach(function (dot) {
      const dotIndex = stepOrder.indexOf(dot.getAttribute("data-progress-step"));
      dot.classList.toggle("is-complete", dotIndex >= 0 && dotIndex < safeIndex);
      dot.classList.toggle("is-current", dotIndex === safeIndex);
    });
  }

  function setStep(name, state, message) {
    const step = stepNodes[name];
    if (!step) {
      return;
    }
    step.classList.remove("is-running", "is-complete");
    if (state) {
      step.classList.add("is-" + state);
    }
    progressDots.forEach(function (dot) {
      if (dot.getAttribute("data-progress-step") === name && state === "complete") {
        dot.classList.add("is-complete");
      }
    });
    const messageNode = step.querySelector("p");
    if (messageNode) {
      if (messageNode.textContent && messageNode.textContent !== message) {
        window.clearTimeout(step.messageTimer);
        step.classList.add("is-text-changing");
        step.messageTimer = window.setTimeout(function () {
          messageNode.textContent = message;
          step.classList.remove("is-text-changing");
        }, 140);
      } else {
        messageNode.textContent = message;
        step.classList.remove("is-text-changing");
      }
    }
  }

  function sleep(time) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, time);
    });
  }

  function getValue(formData, key) {
    return String(formData.get(key) || "").trim();
  }

  function nhtsaValue(result, key) {
    const value = result && result[key];
    if (!value || value === "Not Applicable" || value === "0") {
      return "";
    }
    return value;
  }

  function friendlyEngine(result) {
    const liters = nhtsaValue(result, "DisplacementL");
    if (!liters) {
      return "";
    }
    const parsedLiters = Number(liters);
    if (!Number.isFinite(parsedLiters) || parsedLiters <= 0) {
      return "";
    }
    return parsedLiters.toFixed(1).replace(".0", "") + "L";
  }

  async function decodeVin(vin) {
    if (!vin || vin.length < 11) {
      return {};
    }

    const endpoint = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/" + encodeURIComponent(vin) + "?format=json";
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error("VIN API unavailable");
    }
    const payload = await response.json();
    const result = payload.Results && payload.Results[0] ? payload.Results[0] : {};

    return {
      year: nhtsaValue(result, "ModelYear"),
      make: nhtsaValue(result, "Make"),
      model: nhtsaValue(result, "Model"),
      trim: nhtsaValue(result, "Trim") || nhtsaValue(result, "Series") || nhtsaValue(result, "Trim2"),
      body: nhtsaValue(result, "BodyClass"),
      engine: friendlyEngine(result),
      drive: nhtsaValue(result, "DriveType"),
      fuel: nhtsaValue(result, "FuelTypePrimary"),
      cab: nhtsaValue(result, "CabType")
    };
  }

  function updateVehicleData(vehicle) {
    if (!dataList) {
      return;
    }
    const values = [
      vehicle.year,
      vehicle.make,
      vehicle.model,
      vehicle.trim,
      vehicle.body,
      vehicle.engine,
      vehicle.drive,
      vehicle.fuel,
      vehicle.cab
    ];

    dataList.querySelectorAll("dd").forEach(function (node, index) {
      node.textContent = values[index] || "-";
    });
  }

  function clearVehicleData() {
    if (!dataList) {
      return;
    }
    dataList.querySelectorAll("div").forEach(function (item) {
      item.classList.remove("is-received");
    });
    dataList.querySelectorAll("dd").forEach(function (node) {
      node.textContent = "-";
    });
  }

  function revealVehicleData(vehicle) {
    if (!dataList) {
      return;
    }
    const values = [
      vehicle.year,
      vehicle.make,
      vehicle.model,
      vehicle.trim,
      vehicle.body,
      vehicle.engine,
      vehicle.drive,
      vehicle.fuel,
      vehicle.cab
    ];

    dataList.querySelectorAll("div").forEach(function (item) {
      item.classList.remove("is-received");
    });
    dataList.querySelectorAll("dd").forEach(function (node) {
      node.textContent = "-";
    });

    dataList.querySelectorAll("dd").forEach(function (node, index) {
      window.setTimeout(function () {
        node.textContent = values[index] || "-";
        const item = node.closest("div");
        if (item) {
          item.classList.add("is-received");
        }
      }, index * 85);
    });
  }

  function formatVehicleName(vehicle) {
    const bodyStyle = cleanBodyStyle(vehicle.body);
    const category = vehicleCategory(bodyStyle);
    const make = titleCase(vehicle.make);
    const model = titleCase(vehicle.model);
    const trim = titleCase(vehicle.trim);

    if (make && model) {
      return [vehicle.year, make, model, trim].filter(Boolean).join(" ");
    }
    if (model) {
      return [vehicle.year, model, trim].filter(Boolean).join(" ");
    }
    if (make) {
      return [vehicle.year, make, category].filter(Boolean).join(" ");
    }
    if (vehicle.year) {
      return [vehicle.year, category].filter(Boolean).join(" ");
    }
    return category;
  }

  function hasVehicleData(vehicle) {
    return Boolean(vehicle.year || vehicle.make || vehicle.model || vehicle.trim || vehicle.body || vehicle.engine || vehicle.drive || vehicle.fuel || vehicle.cab);
  }

  function titleCase(value) {
    return String(value || "").toLowerCase().replace(/\b[a-z0-9]/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function cleanBodyStyle(body) {
    const value = String(body || "").toLowerCase();
    if (!value) {
      return "";
    }
    if (value.includes("pickup")) {
      return "pickup";
    }
    if (value.includes("sedan")) {
      return "sedan";
    }
    if (value.includes("sport utility") || value.includes("suv")) {
      return "SUV";
    }
    if (value.includes("hatchback")) {
      return "hatchback";
    }
    if (value.includes("coupe")) {
      return "coupe";
    }
    if (value.includes("van")) {
      return "van";
    }
    return value.replace("/", " / ");
  }

  function bodyBenefit(bodyStyle, tones) {
    const value = String(bodyStyle || "").toLowerCase();
    if (value === "pickup") {
      if (hasSelectedTone(tones, "premium")) {
        return "confident capability, a strong road presence, and the versatility to handle demanding weekdays and weekend plans";
      }
      if (hasSelectedTone(tones, "friendly")) {
        return "useful everyday strength, flexible cargo room, and the kind of versatility that is easy to picture in daily life";
      }
      return "strong capability, practical cargo flexibility, and the versatility to handle both jobsite needs and weekend plans";
    }
    if (value === "sedan") {
      if (hasSelectedTone(tones, "premium")) {
        return "refined comfort, smooth daily driving, and a polished feel for commuting or nights out";
      }
      if (hasSelectedTone(tones, "friendly")) {
        return "easy daily driving, a welcoming cabin, and comfort that fits naturally into a busy week";
      }
      return "comfortable daily driving, easy maneuverability, and a refined cabin for commuting or weekend errands";
    }
    if (value === "suv") {
      if (hasSelectedTone(tones, "premium")) {
        return "confident road presence, flexible space, and a more elevated feel for everyday travel";
      }
      if (hasSelectedTone(tones, "friendly")) {
        return "room for passengers, flexible cargo space, and comfort that makes everyday plans easier";
      }
      return "versatile space, confident road presence, and the flexibility families and active drivers appreciate";
    }
    if (value === "hatchback") {
      return "easy city driving, flexible cargo space, and practical efficiency for everyday use";
    }
    if (value === "coupe") {
      return "a sportier profile, confident road feel, and style that stands out on the road";
    }
    if (value === "van") {
      return "generous interior space, practical access, and everyday versatility";
    }
    return "practical capability, everyday comfort, and the flexibility shoppers expect";
  }

  function vehicleCategory(bodyStyle) {
    const value = String(bodyStyle || "").toLowerCase();
    if (value === "pickup") {
      return "truck";
    }
    if (value === "suv") {
      return "SUV";
    }
    return value || "vehicle";
  }

  function cleanDrive(drive) {
    const value = String(drive || "").toLowerCase();
    if (!value) {
      return "";
    }
    if (value.includes("4wd") || value.includes("4-wheel") || value.includes("4x4")) {
      return "4WD";
    }
    if (value.includes("4x2") || value.includes("2wd") || value.includes("two-wheel")) {
      return "two-wheel drive";
    }
    if (value.includes("awd") || value.includes("all-wheel")) {
      return "all-wheel drive";
    }
    if (value.includes("fwd") || value.includes("front-wheel")) {
      return "front-wheel drive";
    }
    if (value.includes("rwd") || value.includes("rear-wheel")) {
      return "rear-wheel drive";
    }
    return "";
  }

  function cleanFuel(fuel) {
    const value = String(fuel || "").toLowerCase();
    if (!value) {
      return "";
    }
    if (value.includes("electric") && value.includes("hybrid")) {
      return "hybrid capability";
    }
    if (value.includes("electric")) {
      return "electric power";
    }
    if (value.includes("diesel")) {
      return "diesel power";
    }
    if (value.includes("gasoline") || value.includes("gas")) {
      return "a gasoline powertrain";
    }
    return "";
  }

  function cleanCab(cab) {
    const value = String(cab || "").toLowerCase();
    if (!value) {
      return "";
    }
    if (value.includes("crew") || value.includes("supercrew")) {
      return "crew cab";
    }
    if (value.includes("extended") || value.includes("supercab")) {
      return "extended cab";
    }
    if (value.includes("regular")) {
      return "regular cab";
    }
    return "";
  }

  function cleanEngine(engine) {
    const value = String(engine || "").trim();
    if (!value) {
      return "";
    }
    if (/^[A-Z0-9-]{3,8}$/.test(value) && !/\d\.\d/.test(value)) {
      return "";
    }
    return value;
  }

  function formatProofPoints(proof) {
    return formatList(proofPoints(proof));
  }

  function proofPoints(proof) {
    const points = String(proof || "")
      .split(",")
      .map(function (point) {
        return point.trim();
      })
      .filter(Boolean);

    if (!points.length) {
      return [
        "an award-winning customer experience",
        "transparent negotiation-free pricing",
        "a certified inspection by manufacturer-trained technicians",
        "flexible online or in-store purchase support"
      ];
    }
    return points.slice(0, 5);
  }

  function formatList(items) {
    const list = items.filter(Boolean);
    if (!list.length) {
      return "";
    }
    if (list.length === 1) {
      return list[0];
    }
    if (list.length === 2) {
      return list[0] + " and " + list[1];
    }
    return list.slice(0, -1).join(", ") + ", and " + list[list.length - 1];
  }

  function normalizeTones(tones) {
    const selected = tones.filter(Boolean);
    return selected.length ? selected : ["clear"];
  }

  function hasSelectedTone(tones, tone) {
    return tones.includes(tone);
  }

  function fitLine(category, tones) {
    const reasons = [];
    if (hasSelectedTone(tones, "practical")) {
      reasons.push("daily driving");
    }
    if (hasSelectedTone(tones, "friendly")) {
      reasons.push("busy weeks and weekend plans");
    }
    if (hasSelectedTone(tones, "premium")) {
      reasons.push("a more polished feel");
    }
    if (hasSelectedTone(tones, "confidence")) {
      reasons.push("added peace of mind");
    }
    if (hasSelectedTone(tones, "clear") || !reasons.length) {
      reasons.push("straightforward comparison shopping");
    }
    return " This " + category + " is a strong fit for shoppers looking for " + formatList(reasons.slice(0, 4)) + ".";
  }

  function toneCloser(dealerName, tones) {
    const commitments = [];
    if (hasSelectedTone(tones, "clear")) {
      commitments.push("straightforward information");
    }
    if (hasSelectedTone(tones, "friendly")) {
      commitments.push("helpful communication");
    }
    if (hasSelectedTone(tones, "premium")) {
      commitments.push("a polished handoff");
    }
    if (hasSelectedTone(tones, "practical")) {
      commitments.push("simple online or in-store steps");
    }
    if (hasSelectedTone(tones, "confidence")) {
      commitments.push("careful preparation and purchase support");
    }
    return "From first look to final paperwork, " + dealerName + " focuses on " + formatList(commitments.slice(0, 4)) + ".";
  }

  function makeDescription(vehicle, dealer, proof, tones) {
    const selectedTones = normalizeTones(tones);
    const vehicleName = formatVehicleName(vehicle);
    const dealerName = dealer || "ABC Dealership";
    const bodyStyle = cleanBodyStyle(vehicle.body);
    const engine = cleanEngine(vehicle.engine);
    const category = vehicleCategory(bodyStyle);
    const benefit = bodyBenefit(bodyStyle, selectedTones);
    const fuelHighlight = cleanFuel(vehicle.fuel);
    const highlights = [
      engine ? "a " + engine + " engine" : "",
      cleanDrive(vehicle.drive),
      engine && fuelHighlight === "a gasoline powertrain" ? "" : fuelHighlight,
      cleanCab(vehicle.cab)
    ]
      .filter(Boolean)
      .slice(0, 3);
    const highlightLine = highlights.length ? " Key highlights include " + formatList(highlights) + "." : "";

    return {
      intro: "Now available at " + dealerName + ", this " + vehicleName + " offers " + benefit + "." + highlightLine + fitLine(category, selectedTones),
      heading: "Why buy from " + dealerName,
      usps: proofPoints(proof),
      closer: toneCloser(dealerName, selectedTones)
    };
  }

  function renderDescriptionOutput(description) {
    if (!descriptionOutput) {
      return;
    }
    descriptionOutput.textContent = "";

    const intro = document.createElement("p");
    intro.textContent = description.intro;
    descriptionOutput.appendChild(intro);

    if (description.usps && description.usps.length) {
      const heading = document.createElement("h4");
      heading.textContent = description.heading;
      descriptionOutput.appendChild(heading);

      const list = document.createElement("ul");
      description.usps.forEach(function (point) {
        const item = document.createElement("li");
        item.textContent = point;
        list.appendChild(item);
      });
      descriptionOutput.appendChild(list);
    }

    const closer = document.createElement("p");
    closer.textContent = description.closer;
    descriptionOutput.appendChild(closer);
  }

  function setDescriptionMessage(message) {
    if (!descriptionOutput) {
      return;
    }
    descriptionOutput.textContent = "";
    const messageNode = document.createElement("p");
    messageNode.textContent = message;
    descriptionOutput.appendChild(messageNode);
  }

  function setSampleValues() {
    const vinField = demoForm.elements.vin;
    if (vinField) {
      vinField.value = sampleVehicle.vin;
      vinField.focus();
    }
  }

  function resetDemo() {
    if (demoStage) {
      demoStage.classList.remove("is-processing", "is-complete", "is-workflow-done");
    }
    if (vehicleDataCard) {
      vehicleDataCard.classList.remove("is-highlighted");
    }
    setActiveStep("decode");
    Object.keys(stepNodes).forEach(function (name) {
      setStep(name, "", name === "decode" ? "Waiting for input." : "Waiting for previous step.");
    });
    clearVehicleData();
    setDescriptionMessage("Generated copy will appear here after the workflow runs.");
    const vinField = demoForm.elements.vin;
    if (vinField) {
      window.setTimeout(function () {
        vinField.focus();
      }, 80);
    }
  }

  async function runDemo(event) {
    event.preventDefault();
    if (demoStage) {
      demoStage.classList.remove("is-complete", "is-processing", "is-workflow-done");
      demoStage.classList.add("is-transitioning");
      await sleep(120);
      demoStage.classList.remove("is-transitioning");
      demoStage.classList.add("is-processing");
    }
    const formData = new FormData(demoForm);
    const vin = getValue(formData, "vin").toUpperCase();
    const dealer = getValue(formData, "dealer");
    const tones = formData.getAll("tones").map(function (tone) {
      return String(tone);
    });
    const proof = getValue(formData, "proof");

    setStep("decode", "running", "Calling the NHTSA VIN API.");
    setStep("structure", "", "Waiting for vehicle data.");
    setStep("brand", "", "Waiting for proof points.");
    setStep("description", "", "Waiting to create the mock output.");
    setActiveStep("decode");
    setDescriptionMessage("Running workflow...");
    if (vehicleDataCard) {
      vehicleDataCard.classList.remove("is-highlighted");
    }
    clearVehicleData();

    const decodeResult = decodeVin(vin).then(function (vehicle) {
      return { vehicle: vehicle };
    }).catch(function () {
      return { error: true };
    });
    await sleep(stepWorkingMs);

    const decodedResult = await decodeResult;
    let decodedVehicle = decodedResult.vehicle || {};
    let vehicle = decodedVehicle;
    let decodeMessage = decodedResult.error ? "NHTSA lookup was unavailable here, so a sample fallback was used when possible." : "No complete decode returned for this VIN.";

    if (decodedVehicle.make) {
      decodeMessage = "Vehicle attributes returned from NHTSA.";
    }
    if (!hasVehicleData(vehicle) && vin === sampleVehicle.vin) {
      vehicle = {
        year: sampleVehicle.year,
        make: sampleVehicle.make,
        model: sampleVehicle.model,
        trim: sampleVehicle.trim,
        body: sampleVehicle.body,
        engine: sampleVehicle.engine,
        drive: sampleVehicle.drive,
        fuel: sampleVehicle.fuel,
        cab: sampleVehicle.cab
      };
      decodeMessage = "Sample vehicle attributes loaded for the demo.";
    }

    setStep("decode", "complete", decodeMessage);
    await sleep(stepCompleteMs);
    setActiveStep("structure");
    setStep("structure", "running", "Structuring vehicle attributes.");
    await sleep(stepWorkingMs);
    revealVehicleData(vehicle);
    if (vehicleDataCard) {
      vehicleDataCard.classList.add("is-highlighted");
    }
    setStep("structure", "complete", hasVehicleData(vehicle) ? "Vehicle data is ready." : "No vehicle attributes were returned.");

    await sleep(stepCompleteMs);
    setActiveStep("brand");
    setStep("brand", "running", "Applying proof points and tone options.");
    await sleep(stepWorkingMs);
    setStep("brand", "complete", "Brand inputs are ready.");

    await sleep(stepCompleteMs);
    setActiveStep("description");
    setStep("description", "running", "Generating mock copy.");
    await sleep(stepWorkingMs);
    if (descriptionOutput) {
      if (hasVehicleData(vehicle)) {
        renderDescriptionOutput(makeDescription(vehicle, dealer, proof, tones));
      } else {
        setDescriptionMessage("This VIN did not return enough data. Try the sample VIN to see the full workflow.");
      }
    }
    setStep("description", "complete", "Mock description ready.");
    if (demoStage) {
      demoStage.classList.add("is-workflow-done");
    }
    await sleep(stepCompleteMs);
    if (demoStage) {
      demoStage.classList.remove("is-processing");
      demoStage.classList.add("is-complete");
    }
  }

  if (sampleButton) {
    sampleButton.addEventListener("click", setSampleValues);
  }
  if (resetButton) {
    resetButton.addEventListener("click", resetDemo);
  }
  demoForm.addEventListener("submit", runDemo);
}());
