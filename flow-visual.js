{
    "version": "7.2",
    "data_api_version": "3.0",
    "routing_model": {
        "INSURANCE_SELECTION": ["PLAN_DETAILS"],
        "PLAN_DETAILS": ["PRODUCT_DATA"],
        "PRODUCT_DATA": ["CLIENT_DATA"],
        "CLIENT_DATA": ["PAYMENT"],
        "PAYMENT": ["SUCCESS_PIX", "SUCCESS_CARD"]
    },
    "screens": [
        {
            "id": "INSURANCE_SELECTION",
            "title": "Selecione o Seguro",
            "data": {},
            "layout": {
                "type": "SingleColumnLayout",
                "children": [
                    {
                        "type": "TextHeading",
                        "text": "Iphone 15 256GB"
                    },
                    {
                        "type": "TextBody",
                        "text": "Escolha o tipo de cobertura desejada para o seu aparelho:"
                    },
                    {
                        "type": "RadioButtonsGroup",
                        "name": "insurance_type",
                        "label": "Selecione o Seguro",
                        "required": true,
                        "data-source": [
                            {
                                "id": "danos_materiais",
                                "title": "Danos Materiais",
                                "description": "Cobertura para danos físicos acidentais por queda e líquido"
                            },
                            {
                                "id": "garantia_estendida",
                                "title": "Garantia Estendida",
                                "description": "Extensão da garantia do fabricante com cobertura ampliada"
                            },
                            {
                                "id": "roubo_furto",
                                "title": "Roubo e Furto",
                                "description": "Cobertura para roubo, furto simples e qualificado"
                            }
                        ]
                    },
                    {
                        "type": "Footer",
                        "label": "Continuar",
                        "on-click-action": {
                            "name": "navigate",
                            "next": {
                                "type": "screen",
                                "name": "PLAN_DETAILS"
                            },
                            "payload": {}
                        }
                    }
                ]
            }
        },
        {
            "id": "PLAN_DETAILS",
            "title": "Selecione o Seguro",
            "data": {},
            "layout": {
                "type": "SingleColumnLayout",
                "children": [
                    {
                        "type": "TextSubheading",
                        "text": "Escolha o Período de Cobertura"
                    },
                    {
                        "type": "RadioButtonsGroup",
                        "name": "plan_period",
                        "label": "Período",
                        "required": true,
                        "data-source": [
                            {
                                "id": "12_meses",
                                "title": "12 Meses",
                                "description": "💰 Pix: R$ 593,82 à vista\n💳 Cartão: 12x de R$ 49,90 (Total: R$ 598,80)"
                            },
                            {
                                "id": "6_meses",
                                "title": "6 Meses",
                                "description": "💰 Pix: R$ 319,90 à vista\n💳 Cartão: 6x de R$ 54,90 (Total: R$ 329,40)"
                            }
                        ]
                    },
                    {
                        "type": "TextSubheading",
                        "text": "Benefícios do Seguro"
                    },
                    {
                        "type": "TextBody",
                        "text": "✓ Cobertura ampla\n✓ Economia, comodidade e credibilidade\n✓ Proteção Imediata\n✓ Segurança em momentos de perigo\n✓ Troca por um produto novo na impossibilidade de reparo"
                    },
                    {
                        "type": "Footer",
                        "label": "Continuar",
                        "on-click-action": {
                            "name": "navigate",
                            "next": {
                                "type": "screen",
                                "name": "PRODUCT_DATA"
                            },
                            "payload": {}
                        }
                    }
                ]
            }
        },
        {
            "id": "PRODUCT_DATA",
            "title": "Dados do Produto",
            "data": {},
            "layout": {
                "type": "SingleColumnLayout",
                "children": [
                    {
                        "type": "TextHeading",
                        "text": "Dados do Produto"
                    },
                    {
                        "type": "TextBody",
                        "text": "Informe os dados da nota fiscal e do aparelho:"
                    },
                    {
                        "type": "DatePicker",
                        "name": "nf_date",
                        "label": "Data da Nota Fiscal",
                        "required": true,
                        "min-date": "2020-01-01",
                        "max-date": "2026-03-06",
                        "unavailable-dates": [],
                        "helper-text": "Data de emissão da nota fiscal"
                    },
                    {
                        "type": "TextInput",
                        "name": "nf_number",
                        "label": "Nº da Nota Fiscal",
                        "input-type": "text",
                        "required": true,
                        "helper-text": "Ex: 12345"
                    },
                    {
                        "type": "TextInput",
                        "name": "nf_value",
                        "label": "Valor da Nota Fiscal",
                        "input-type": "text",
                        "required": true,
                        "helper-text": "Ex: 5999.00 (somente números)"
                    },
                    {
                        "type": "TextInput",
                        "name": "imei",
                        "label": "IMEI",
                        "input-type": "number",
                        "required": true,
                        "helper-text": "15 números (disque *#06# para consultar)"
                    },
                    {
                        "type": "Footer",
                        "label": "Continuar",
                        "on-click-action": {
                            "name": "navigate",
                            "next": {
                                "type": "screen",
                                "name": "CLIENT_DATA"
                            },
                            "payload": {}
                        }
                    }
                ]
            }
        },
        {
            "id": "CLIENT_DATA",
            "title": "Dados do Cliente",
            "data": {},
            "layout": {
                "type": "SingleColumnLayout",
                "children": [
                    {
                        "type": "TextHeading",
                        "text": "Dados do Cliente"
                    },
                    {
                        "type": "TextBody",
                        "text": "Preencha os dados do segurado:"
                    },
                    {
                        "type": "TextInput",
                        "name": "full_name",
                        "label": "Nome Completo",
                        "input-type": "text",
                        "required": true,
                        "helper-text": "Nome conforme documento"
                    },
                    {
                        "type": "TextInput",
                        "name": "social_name",
                        "label": "Nome Social",
                        "input-type": "text",
                        "required": false,
                        "helper-text": "Opcional"
                    },
                    {
                        "type": "DatePicker",
                        "name": "birth_date",
                        "label": "Data de Nascimento",
                        "required": true,
                        "min-date": "1900-01-01",
                        "max-date": "2008-03-06",
                        "unavailable-dates": [],
                        "helper-text": "Você deve ter pelo menos 18 anos"
                    },
                    {
                        "type": "Dropdown",
                        "name": "gender",
                        "label": "Sexo",
                        "required": true,
                        "data-source": [
                            { "id": "masculino", "title": "Masculino" },
                            { "id": "feminino", "title": "Feminino" },
                            { "id": "outro", "title": "Outro" }
                        ]
                    },
                    {
                        "type": "TextInput",
                        "name": "cpf",
                        "label": "CPF do Consumidor",
                        "input-type": "text",
                        "required": true,
                        "helper-text": "Digite apenas números (11 dígitos)"
                    },
                    {
                        "type": "TextInput",
                        "name": "rg",
                        "label": "RG",
                        "input-type": "text",
                        "required": false,
                        "helper-text": "Opcional"
                    },
                    {
                        "type": "TextInput",
                        "name": "nationality",
                        "label": "Nacionalidade",
                        "input-type": "text",
                        "required": true,
                        "helper-text": "Ex: Brasileiro(a)"
                    },
                    {
                        "type": "TextInput",
                        "name": "cep",
                        "label": "CEP",
                        "input-type": "text",
                        "required": true,
                        "helper-text": "Digite os 8 números do CEP"
                    },
                    {
                        "type": "TextInput",
                        "name": "address",
                        "label": "Endereço",
                        "input-type": "text",
                        "required": true,
                        "helper-text": "Rua, Avenida, etc."
                    },
                    {
                        "type": "TextInput",
                        "name": "neighborhood",
                        "label": "Bairro",
                        "input-type": "text",
                        "required": true
                    },
                    {
                        "type": "TextInput",
                        "name": "city",
                        "label": "Cidade",
                        "input-type": "text",
                        "required": true
                    },
                    {
                        "type": "Dropdown",
                        "name": "state",
                        "label": "Estado",
                        "required": true,
                        "data-source": [
                            { "id": "AC", "title": "Acre" },
                            { "id": "AL", "title": "Alagoas" },
                            { "id": "AP", "title": "Amapá" },
                            { "id": "AM", "title": "Amazonas" },
                            { "id": "BA", "title": "Bahia" },
                            { "id": "CE", "title": "Ceará" },
                            { "id": "DF", "title": "Distrito Federal" },
                            { "id": "ES", "title": "Espírito Santo" },
                            { "id": "GO", "title": "Goiás" },
                            { "id": "MA", "title": "Maranhão" },
                            { "id": "MT", "title": "Mato Grosso" },
                            { "id": "MS", "title": "Mato Grosso do Sul" },
                            { "id": "MG", "title": "Minas Gerais" },
                            { "id": "PA", "title": "Pará" },
                            { "id": "PB", "title": "Paraíba" },
                            { "id": "PR", "title": "Paraná" },
                            { "id": "PE", "title": "Pernambuco" },
                            { "id": "PI", "title": "Piauí" },
                            { "id": "RJ", "title": "Rio de Janeiro" },
                            { "id": "RN", "title": "Rio Grande do Norte" },
                            { "id": "RS", "title": "Rio Grande do Sul" },
                            { "id": "RO", "title": "Rondônia" },
                            { "id": "RR", "title": "Roraima" },
                            { "id": "SC", "title": "Santa Catarina" },
                            { "id": "SP", "title": "São Paulo" },
                            { "id": "SE", "title": "Sergipe" },
                            { "id": "TO", "title": "Tocantins" }
                        ]
                    },
                    {
                        "type": "TextInput",
                        "name": "number",
                        "label": "Número",
                        "input-type": "text",
                        "required": true,
                        "helper-text": "Número do endereço"
                    },
                    {
                        "type": "TextInput",
                        "name": "complement",
                        "label": "Complemento",
                        "input-type": "text",
                        "required": false,
                        "helper-text": "Apto, Bloco, etc. (Opcional)"
                    },
                    {
                        "type": "TextInput",
                        "name": "email",
                        "label": "Email",
                        "input-type": "email",
                        "required": true,
                        "helper-text": "Para envio da apólice"
                    },
                    {
                        "type": "TextInput",
                        "name": "mobile",
                        "label": "Celular",
                        "input-type": "phone",
                        "required": true,
                        "helper-text": "Digite com DDD (11 dígitos)"
                    },
                    {
                        "type": "TextInput",
                        "name": "phone",
                        "label": "Telefone",
                        "input-type": "phone",
                        "required": false,
                        "helper-text": "Opcional"
                    },
                    {
                        "type": "Footer",
                        "label": "Continuar",
                        "on-click-action": {
                            "name": "navigate",
                            "next": {
                                "type": "screen",
                                "name": "PAYMENT"
                            },
                            "payload": {}
                        }
                    }
                ]
            }
        },
        {
            "id": "PAYMENT",
            "title": "Dados do Pagamento",
            "data": {},
            "layout": {
                "type": "SingleColumnLayout",
                "children": [
                    {
                        "type": "TextHeading",
                        "text": "Dados do Pagamento"
                    },
                    {
                        "type": "TextBody",
                        "text": "Escolha a forma de pagamento:"
                    },
                    {
                        "type": "RadioButtonsGroup",
                        "name": "payment_method",
                        "label": "Forma de Pagamento",
                        "required": true,
                        "data-source": [
                            {
                                "id": "SUCCESS_PIX",
                                "title": "💰 Pix à Vista",
                                "description": "R$ 593,82 (12 meses) ou R$ 319,90 (6 meses). Desconto à vista, ativação imediata."
                            },
                            {
                                "id": "SUCCESS_CARD",
                                "title": "💳 Cartão de Crédito",
                                "description": "12x de R$ 49,90 (12 meses) ou 6x de R$ 54,90 (6 meses). Link enviado por e-mail."
                            }
                        ]
                    },
                    {
                        "type": "Footer",
                        "label": "Confirmar",
                        "on-click-action": {
                            "name": "data_exchange",
                            "payload": {
                                "payment_method": "${form.payment_method}"
                            }
                        }
                    }
                ]
            }
        },
        {
            "id": "SUCCESS_PIX",
            "title": "Pagamento via Pix",
            "terminal": true,
            "data": {},
            "layout": {
                "type": "SingleColumnLayout",
                "children": [
                    {
                        "type": "RichText",
                        "text": [
                            "# Seguro contratado com sucesso!",
                            "## Pagamento via Pix:",
                            "Chave Pix: pagamento@zurich.com.br",
                            "Você tem 30 minutos para concluir o pagamento. O seguro é ativado imediatamente após a confirmação.",
                            "![QR Code Pix](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUoAAAFKCAIAAAD0S4FSAAAFjklEQVR4nO3dQW4rNxBAQU+Q+19Z2WYlfIRmmnxTtZclj/TQmwb5fD6fH6Dor+kPAOwib8iSN2TJG7LkDVnyhix5Q5a8IUvekCVvyJI3ZMkbsuQNWfKGLHlDlrwhS96QJW/IkjdkyRuy5A1Z8oYseUOWvCFL3pAlb8iSN2TJG7LkDVnyhix5Q5a8IUvekCVvyJI3ZMkbsuQNWfKGLHlD1t9Tb/w8z0/L5/O57llNfebv7+u38VtMb8iSN2TJG7LkDVnyhix5Q5a8IUvekCVvyBrbWpvaplpx5jbVyrPat1u27xv02/hzpjdkyRuy5A1Z8oYseUOWvCFL3pAlb8iSN2QdurX2trPH9v3l7//Rvr20qZ22G38b+5jekCVvyJI3ZMkbsuQNWfKGLHlDlrwhS96QdeXW2tvY8eK/Mb0hS96QJW/IkjdkyRuy5A1Z8oYseUOWvCHL1toFpm4mvfF0Mf7N9IYseUOWvCFL3pAlb8iSN2TJG7LkDVnyhqwrt9Z621RTN3V+t/Laqe+o99tYYXpDlrwhS96QJW/IkjdkyRuy5A1Z8oYseUPWoVtrU6eLvc3UttzKbpnfxp8zvSFL3pAlb8iSN2TJG7LkDVnyhix5Q5a8IWtsa82ZWL/1rKa2uPbtpflt/BbTG7LkDVnyhix5Q5a8IUvekCVvyJI3ZMkbsp6pDaGpWy/3OXPXat+z2vf/+n5/i+kNWfKGLHlDlrwhS96QJW/IkjdkyRuy5A1Zh94Q+t3UTtuZd2Lu2x5722fuMb0hS96QJW/IkjdkyRuy5A1Z8oYseUOWvCFr7Ky1G08Im9rE2vesbtz/673vPqY3ZMkbsuQNWfKGLHlDlrwhS96QJW/IkjdkHXrW2r5TzVZee+Ze2ts2sfb5XHgv7XemN2TJG7LkDVnyhix5Q5a8IUvekCVvyJI3ZB26tbayIbRvu+jM7bEVU/t/U+fDPReeS7fC9IYseUOWvCFL3pAlb8iSN2TJG7LkDVnyhqyxG0LPPAPszC2ufd/Rvved2g878zlPMb0hS96QJW/IkjdkyRuy5A1Z8oYseUOWvCHr0K21M0/qWvnLbzvF7bsb98Oeod/GCtMbsuQNWfKGLHlDlrwhS96QJW/IkjdkyRuyDr0h9LszzwDb975n7kv1zof77sbdQdMbsuQNWfKGLHlDlrwhS96QJW/IkjdkyRuyrtxam7pd9MZbL78789S63s2zU0xvyJI3ZMkbsuQNWfKGLHlDlrwhS96QJW/IGrsh9G3O3LS78dS6G2+enWJ6Q5a8IUvekCVvyJI3ZMkbsuQNWfKGLHlD1tjW2pk3Kq64cQNsaqdt6uS5z4Xf0QrTG7LkDVnyhix5Q5a8IUvekCVvyJI3ZMkbsg69IfTMk6um7uJcsW+La58zP9WNn9n0hix5Q5a8IUvekCVvyJI3ZMkbsuQNWfKGrCu31t5mZSNq6k7MM31e9jRMb8iSN2TJG7LkDVnyhix5Q5a8IUvekCVvyLK1dv2u1dTJcyu7dFOvvfFbWGF6Q5a8IUvekCVvyJI3ZMkbsuQNWfKGLHlD1pVba2fe43nj5tmZ/9GNO21nMr0hS96QJW/IkjdkyRuy5A1Z8oYseUOWvCHrmdrjOfNsqhVT21QrT9K3//+Yes6mN2TJG7LkDVnyhix5Q5a8IUvekCVvyJI3ZI1trQG7md6QJW/IkjdkyRuy5A1Z8oYseUOWvCFL3pAlb8iSN2TJG7LkDVnyhix5Q5a8IUvekCVvyJI3ZMkbsuQNWfKGLHlDlrwhS96QJW/IkjdkyRuy5A1Z8oYseUOWvCFL3pAlb8iSN2TJG7LkDVnyhix5w0/VP1Syi5XNJmnNAAAAAElFTkSuQmCC)",
                            "Em caso de dúvidas, entre em contato com nossa central de atendimento."
                        ]
                    },
                    {
                        "type": "Footer",
                        "label": "Finalizar",
                        "on-click-action": {
                            "name": "complete",
                            "payload": {}
                        }
                    }
                ]
            }
        },
        {
            "id": "SUCCESS_CARD",
            "title": "Pagamento via Cartão",
            "terminal": true,
            "data": {},
            "layout": {
                "type": "SingleColumnLayout",
                "children": [
                    {
                        "type": "RichText",
                        "text": [
                            "# Seguro contratado com sucesso!",
                            "## Pagamento via Cartão de Crédito",
                            "Enviamos o link de pagamento para o seu e-mail cadastrado.",
                            "Acesse o link e insira os dados do cartão em até 24 horas para ativar o seguro.",
                            "Em caso de dúvidas, entre em contato com nossa central de atendimento."
                        ]
                    },
                    {
                        "type": "Footer",
                        "label": "Finalizar",
                        "on-click-action": {
                            "name": "complete",
                            "payload": {}
                        }
                    }
                ]
            }
        }
    ]
}
