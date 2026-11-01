Here is a detailed breakdown of all the features that live directly inside the Telegram Bot               
  (@M23CashewBot), organized from the farmer's experience:                                                  
  ──────                                                                                                    
  ### 1. Instant Khmer Q&A (Text & Voice Notes)                                                             
                                                                                                            
  Cambodian farmers frequently prefer voice messages or typing in Khmer script over navigating complex web  
  menus.                                                                                                    
                                                                                                            
  • Text Chat: A farmer types any question in Khmer (e.g. "ស្​លឹកស្​វ​ាយចន្​ទីរួញ ហ​ើយម​ានចំណុចខ្​ម​ៅ ត្​រូវប​ាញ់ថ្​ន​ាំអី?" — "Cashew 
  leaves are crinkling with black spots, what should I spray?").                                            
  • Voice Notes (Voice-in): Farmers can hold the Telegram microphone button and speak in Khmer. The bot     
  transcribes the voice note, processes it with the cashew advisor logic, and replies back with both text   
  and voice.                                                                                                
  • Verified Advice: Answers come directly from verified cashew agronomy guidelines (kb-v2.json), including 
  specific active ingredients, dosage per 200L tank, and safety precautions.                                
  ──────                                                                                                    
  ### 2. 📷 Photo Pest & Disease Diagnosis                                                                  
                                                                                                            
  Farmers don't always know the scientific or Khmer names for specific pests.                               
                                                                                                            
  • How it works: The farmer takes a photo of infected leaves, flower panicles, trunk, or nuts directly with
  their phone camera and sends it into the Telegram chat.                                                   
  • Instant Diagnosis: The bot runs Gemini Vision against cashew disease profiles (Anthracnose, Helopeltis /
  Tea Mosquito Bug, Shoot Borer, Powdery Mildew, etc.).                                                     
  • Structured Response Delivered in Telegram:                                                              
    🔍 រកឃើញ៖ សត្វមមាចមូស (Tea Mosquito Bug / Helopeltis)                                                        
    ⚠️ កម្រិតធ្ងន់ធ្ងរ៖ មធ្យម (Medium)                                                                                
                                                                                                            
    💊 វិធានការព្យាបាល៖                                                                                            
    • ថ្នាំណែនាំ៖ Lambda-cyhalothrin ឬ Cartap                                                                      
    • កម្រិតប្រើ៖ ២០-៣០ មីលីលីត្រ / ទឹក ២០ លីត្រ                                                                           
    • ពេលវេលាបាញ់៖ ពេលព្រឹកព្រលឹម ឬពេលល្ងាច (ចៀសវាងពេលថ្ងៃក្តៅ និងឃ្មុំក្រេបលម្អង)                                                             
                                                                                                            
  ──────                                                                                                    
  ### 3. Quick 30-Second Farm Onboarding (Interactive Buttons)                                              
                                                                                                            
  No registration forms or passwords. The first time a farmer taps /start, the bot initiates a 3-step setup 
  using Telegram's interactive tap buttons:                                                                 
                                                                                                            
  1. Province: [ កំពង់ធំ ] [ ក្​រច​េ​ះ ] [ រតនគិរី ] [ កំពង់ច​ាម ] [ ផ្​ស​េងទ​ៀត ]                                          
  2. Tree Age: [ ១-២ ឆ្​ន​ាំ ] [ ៣-៥ ឆ្​ន​ាំ ] [ ៦ ឆ្​ន​ាំឡ​ើងទ​ៅ ]                                                       
  3. Farm Size: Farmer types or taps hectare size (e.g. 2 ha).                                              
                                                                                                            
  │ All future advice automatically factors in their tree age and province climate without asking again.    
  ──────                                                                                                    
  ### 4. Proactive Season & Spray Reminders (Push Notifications)                                            
                                                                                                            
  Because it runs on Telegram, the bot can proactively ping the farmer without requiring them to remember to
  open an app:                                                                                              
                                                                                                            
  • Stage-Specific Alerts:                                                                                  
      • Nov – Dec (Flowering): "🌸 រដូវច​េញផ្​ក​ាប​ានមកដល់ហ​ើយ! ពិនិត្​យម​ើលថ​ាត​ើផ្​ក​ារីកល​ើស ៨០% ឬន​ៅ                         
      មុននឹងប​ាញ់ថ្​ន​ាំក​ារព​ារជំងឺអង់ត្​រ​ាក់ណូស។"                                                                          
      • Feb – Mar (Nut Development): Reminders to inspect for stem borers and avoid hazardous sprays close  
      to harvest.                                                                                           
  • Weather-Triggered Spray Alerts:                                                                         
      • Checks local weather: "🌧 ថ្​ង​ៃស្​អ​ែកន​ៅខ​េត្​តកំពង់ធំអ​ាចនឹងម​ានភ្​ល​ៀងធ្​ល​ាក់។ សូមផ្​អ​ាកក​ារប​ាញ់ថ្​ន​ាំថ្​ង​ៃន​េ​ះ                   
      ដ​ើម្​បីកុំឱ្​យខ​ាតថ្​ន​ាំហូរត​ាមទឹកភ្​ល​ៀង។" (Rain forecast tomorrow — hold off on spraying today so chemicals don't    
      wash off).                                                                                            
                                                                                                            
  ──────                                                                                                    
  ### 5. One-Tap Spray Journaling & Logging                                                                 
                                                                                                            
  Farmers rarely keep paper logbooks, but export buyers and cooperatives demand spray records.              
                                                                                                            
  • After receiving advice or a reminder, Telegram displays actionable quick-reply buttons:                 
    [ ✅ បានបាញ់ថ្នាំរួច (Sprayed) ]   [ ⏰ រំលឹកថ្ងៃស្អែក (Remind Tomorrow) ]                                              
                                                                                                            
  • When the farmer taps "✅ ប​ានប​ាញ់ថ្​ន​ាំរួច":                                                                  
      • The bot automatically records the date, chemical, and dosage into the Supabase database.            
      • Bot confirms: "✅ ប​ានកត់ត្​រ​ាជ​ោគជ័យ! ប​ាញ់ល​ើកទី ២ ក​ាលបរិច្​ឆ​េទ ០១ វិច្​ឆិក​ា។"                                     
                                                                                                            
  ──────                                                                                                    
  ### 6. Interactive Menu Commands (/menu, /today, /weather)                                                
                                                                                                            
  Farmers can access quick utilities at any time using Telegram's built-in Menu Bar:                        
                                                                                                            
  • /today or /កិច្​ចក​ារខ​ែន​េ​ះ: Displays current seasonal priorities (e.g., pruning, fertilizer formulas N-P-K  
  ratios, weeding).                                                                                         
  • /weather or /អ​ាក​ាសធ​ាតុ: Instant local spray forecast (wind speed, humidity, rain chance).                
  • /passport or /រប​ាយក​ារណ៍: Sends back a summary card of all sprays and harvest logs this season.           
  ──────                                                                                                    
  ### 7. Seamless Bridge to Web App (Farm Passport)                                                         
                                                                                                            
  • When a farmer wants to see their full charts, visual timeline, or show an inspector their official Farm 
  Passport, the bot sends a one-tap magic link:                                                             
    📄 ចុចទីនេះដើម្បីមើលកាតកសិដ្ឋានពេញលេញ៖                                                                                  
    🔗 [បើក Farm Passport របស់អ្នក] (m23-cashew-advisor.vercel.app/passport?id=...)                             
                                                                                                            
  • The web app and Telegram bot share the exact same database—anything logged on Telegram shows up on the  
  web app instantly, and vice versa.                                                                        
  ──────                                                                                                    
  ### Summary Table                                                                                         
                                                                                                            
   Feature                │ Input Method                 │ What the Bot Delivers
  ────────────────────────┼──────────────────────────────┼──────────────────────────────────────────────────
   Pest & Problem Advice  │ Text or Voice message        │ Exact chemical/organic recipe, dosage, and
                          │ (Khmer)                      │ safety window
   Visual Diagnosis       │ Camera photo of leaf /       │ Instant pest detection, danger level, treatment
                          │ flower / nut                 │ guide
   Daily / Seasonal Care  │ /today command or scheduled  │ Season-specific checklist (pruning, fertilizer,
                          │ alert                        │ weeding)
   Spray & Harvest Log    │ 1-tap [ ✅ Done ] button     │ Saves into database; builds export-ready spray
                          │                              │ history
   Weather Spray Advisory │ Automatic or /weather        │ Real-time "Safe to spray" vs "Hold off
                          │                              │ (rain/wind)" alert
   Farm Audit Link        │ /passport command            │ Exportable record link for buyers, cooperatives,
                          │                              │ or lenders
